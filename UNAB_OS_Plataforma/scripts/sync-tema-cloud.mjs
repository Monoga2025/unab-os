#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createClient } from "@supabase/supabase-js";
import { cleanDisplayFileName } from "./lib/tema-filenames.mjs";

const TEMA_ORIGIN = "https://tema.unab.edu.co";
const REST_URL = `${TEMA_ORIGIN}/webservice/rest/server.php`;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ownerId = process.env.UNAB_OS_OWNER_ID;
const token = process.env.TEMA_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ownerId || !token || !supabaseUrl || !secretKey) {
  throw new Error("Set UNAB_OS_OWNER_ID, TEMA_TOKEN, SUPABASE_URL and SUPABASE_SECRET_KEY.");
}
if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error("UNAB_OS_OWNER_ID must be a UUID.");

const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tempRoot = await mkdtemp(join(tmpdir(), "unab-tema-sync-"));
let syncId;

async function moodleCall(wsfunction, params = {}) {
  const body = new URLSearchParams({ wstoken: token, wsfunction, moodlewsrestformat: "json" });
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));
  const response = await fetch(REST_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`TEMA ${wsfunction} returned ${response.status}.`);
  const payload = await response.json();
  if (payload?.exception || payload?.error) throw new Error(String(payload.message || payload.error || `TEMA rejected ${wsfunction}.`));
  return payload;
}

async function upsert(table, rows, onConflict) {
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabase.from(table).upsert(rows.slice(index, index + 100), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

function unixIso(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function moduleDate(module, patterns) {
  const date = Array.isArray(module.dates) ? module.dates.find((item) => patterns.some((pattern) => pattern.test(String(item?.label || "")))) : null;
  return unixIso(date?.timestamp);
}

function activeState(course, nowSeconds) {
  const start = Number(course.startdate || 0);
  const end = Number(course.enddate || 0);
  if (start > nowSeconds) return "unknown";
  return end && end < nowSeconds ? "historical" : "active";
}

function safeCandidateId(moduleId, index) {
  return `moodle-${String(moduleId).replace(/[^A-Za-z0-9_-]/g, "")}-${index}`.slice(0, 128);
}

function safeExtension(fileName) {
  const match = fileName.match(/\.([A-Za-z0-9]{1,10})$/);
  return match ? `.${match[1].toLowerCase()}` : ".bin";
}

async function stageDownload(candidate) {
  const url = new URL(candidate.fileUrl);
  if (url.origin !== TEMA_ORIGIN) throw new Error(`Untrusted file host for ${candidate.candidateId}.`);
  url.searchParams.set("token", token);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) throw new Error(`File ${candidate.candidateId} returned ${response.status}.`);
  const responseType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || candidate.contentType || "application/octet-stream";
  if (responseType === "text/html" || responseType === "application/xhtml+xml") {
    throw new Error(`File ${candidate.candidateId} returned an HTML page instead of a resource.`);
  }
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_FILE_BYTES) throw new Error(`File ${candidate.candidateId} is too large.`);
  const path = join(tempRoot, candidate.candidateId);
  const hash = createHash("sha256");
  let bytes = 0;
  const guard = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length;
    if (bytes > MAX_FILE_BYTES) return callback(new Error(`File ${candidate.candidateId} is too large.`));
    hash.update(chunk);
    callback(null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), guard, createWriteStream(path, { mode: 0o600 }));
  if (bytes < 1) throw new Error(`File ${candidate.candidateId} is empty.`);
  return { path, bytes, sha256: hash.digest("hex"), contentType: responseType };
}

async function uploadStream(objectName, staged) {
  const encoded = objectName.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${supabaseUrl}/storage/v1/object/tema-private/${encoded}`, {
    method: "POST",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": staged.contentType, "x-upsert": "true", "Cache-Control": "private, max-age=0" },
    body: Readable.toWeb(createReadStream(staged.path)),
    duplex: "half",
  });
  if (!response.ok) throw new Error(`Storage upload failed (${response.status}).`);
}

try {
  const { data: run, error: runError } = await supabase.from("tema_sync_runs").insert({ owner_id: ownerId, status: "running" }).select("id").single();
  if (runError || !run) throw new Error(`Unable to start sync: ${runError?.message}`);
  syncId = run.id;

  const site = await moodleCall("core_webservice_get_site_info");
  if (!site?.userid) throw new Error("TEMA did not return the authenticated user.");
  const enrolled = await moodleCall("core_enrol_get_users_courses", { userid: site.userid });
  if (!Array.isArray(enrolled)) throw new Error("TEMA did not return courses.");
  const now = new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const warnings = [];
  const snapshotCourses = [];
  for (const course of enrolled) {
    try {
      const contents = await moodleCall("core_course_get_contents", { courseid: course.id });
      if (!Array.isArray(contents)) throw new Error("invalid course contents");
      snapshotCourses.push({ course, contents });
    } catch (error) {
      warnings.push(`${course.fullname || course.id}: ${error instanceof Error ? error.message : "contenido no disponible"}`.slice(0, 500));
    }
  }
  if (!snapshotCourses.length) throw new Error("No course returned a usable snapshot; last-good catalog preserved.");

  const capturedAt = now.toISOString();
  await upsert("tema_courses", snapshotCourses.map(({ course }) => ({
    owner_id: ownerId, source_id: String(course.id), name: String(course.fullname || course.shortname), access_failed: false,
    starts_at: unixIso(course.startdate), ends_at: unixIso(course.enddate), last_access_at: unixIso(course.lastaccess),
    active_state: activeState(course, nowSeconds), captured_at: capturedAt, updated_at: capturedAt,
  })), "owner_id,source_id");
  const { data: courseRows, error: courseError } = await supabase.from("tema_courses").select("id,source_id").eq("owner_id", ownerId);
  if (courseError) throw courseError;
  const courseIds = new Map(courseRows.map((row) => [row.source_id, row.id]));

  const sections = snapshotCourses.flatMap(({ course, contents }) => contents.map((section, index) => ({ course, section, index })));
  await upsert("tema_sections", sections.map(({ course, section, index }) => ({
    owner_id: ownerId, course_id: courseIds.get(String(course.id)), source_id: String(section.id ?? index), title: String(section.name || `Sección ${index + 1}`),
    position: Number(section.section ?? index), captured_at: capturedAt, updated_at: capturedAt,
  })), "owner_id,course_id,source_id");
  const { data: sectionRows, error: sectionError } = await supabase.from("tema_sections").select("id,course_id,source_id").eq("owner_id", ownerId);
  if (sectionError) throw sectionError;
  const sourceByCourseId = new Map([...courseIds].map(([source, id]) => [id, source]));
  const sectionIds = new Map(sectionRows.map((row) => [`${sourceByCourseId.get(row.course_id)}:${row.source_id}`, row.id]));

  const modules = sections.flatMap(({ course, section, index }) => (section.modules || []).map((module) => ({ course, section, sectionIndex: index, module })));
  const activities = modules.map(({ course, section, sectionIndex, module }) => ({
    owner_id: ownerId, course_id: courseIds.get(String(course.id)), section_id: sectionIds.get(`${course.id}:${section.id ?? sectionIndex}`), source_id: String(module.id),
    name: String(module.name || module.modname || "Actividad"), module_type: String(module.modname || "resource"), availability_text: module.availabilityinfo ? [String(module.availabilityinfo)] : [],
    candidate_names: (module.contents || []).filter((content) => content.fileurl).map((content) => String(content.filename || "Archivo")),
    opens_at: moduleDate(module, [/open/i, /apertura/i, /desde/i]), due_at: moduleDate(module, [/due/i, /cierre/i, /entrega/i]),
    completion_state: module.completiondata?.state > 0 ? "submitted" : "unknown", captured_at: capturedAt, updated_at: capturedAt,
  }));
  await upsert("tema_activities", activities, "owner_id,section_id,source_id");

  const fileCandidates = modules.flatMap(({ course, section, sectionIndex, module }) => (module.contents || []).flatMap((content, index) => content.fileurl ? [{
    candidateId: safeCandidateId(module.id, index), courseSourceId: String(course.id), sectionSourceId: String(section.id ?? sectionIndex), activityName: String(module.name || "Recurso"),
    fileName: cleanDisplayFileName(String(content.filename || `archivo-${module.id}-${index}`)), fileType: String(content.type || "file"), contentType: String(content.mimetype || "application/octet-stream"), fileUrl: String(content.fileurl),
  }] : []));
  const { data: existingFiles, error: existingError } = await supabase.from("tema_files").select("candidate_id,sha256,storage_object_name").eq("owner_id", ownerId);
  if (existingError) throw existingError;
  const existingByCandidate = new Map(existingFiles.map((file) => [file.candidate_id, file]));
  const existingBySha = new Map(existingFiles.map((file) => [file.sha256, file]));
  const fileRows = [];
  for (const candidate of fileCandidates) {
    try {
      const staged = await stageDownload(candidate);
      const existing = existingByCandidate.get(candidate.candidateId);
      const identicalObject = existingBySha.get(staged.sha256);
      const objectName = existing?.sha256 === staged.sha256
        ? existing.storage_object_name
        : identicalObject
          ? identicalObject.storage_object_name
        : `${ownerId}/tema/${candidate.candidateId}/${staged.sha256}-${candidate.candidateId}${safeExtension(candidate.fileName)}`;
      if (existing?.sha256 !== staged.sha256 && !identicalObject) await uploadStream(objectName, staged);
      fileRows.push({ owner_id: ownerId, candidate_id: candidate.candidateId, course_id: courseIds.get(candidate.courseSourceId), section_id: sectionIds.get(`${candidate.courseSourceId}:${candidate.sectionSourceId}`), activity_name: candidate.activityName,
        file_name: candidate.fileName, file_type: candidate.fileType, content_type: staged.contentType, size_bytes: staged.bytes, sha256: staged.sha256, storage_bucket: "tema-private", storage_object_name: objectName, captured_at: capturedAt, updated_at: capturedAt });
    } catch (error) {
      warnings.push(`${candidate.fileName}: ${error instanceof Error ? error.message : "archivo no disponible"}`.slice(0, 500));
    }
  }
  if (fileRows.length) await upsert("tema_files", fileRows, "owner_id,candidate_id");
  const status = warnings.length ? "partial" : "complete";
  const { error: finishError } = await supabase.from("tema_sync_runs").update({ status, finished_at: new Date().toISOString(), captured_at: capturedAt, course_count: snapshotCourses.length, activity_count: activities.length, file_count: fileRows.length, warnings: warnings.slice(0, 100) }).eq("id", syncId).eq("owner_id", ownerId);
  if (finishError) throw finishError;
  process.stdout.write(`${JSON.stringify({ status, courses: snapshotCourses.length, activities: activities.length, files: fileRows.length, warnings: warnings.length })}\n`);
} catch (error) {
  if (syncId) await supabase.from("tema_sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: String(error instanceof Error ? error.message : error).slice(0, 1000) }).eq("id", syncId).eq("owner_id", ownerId);
  throw error;
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
