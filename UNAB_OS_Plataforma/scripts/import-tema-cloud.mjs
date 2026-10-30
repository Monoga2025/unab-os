#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { cleanDisplayFileName } from "./lib/tema-filenames.mjs";

const root = process.env.TEMA_DATA_ROOT || join(homedir(), ".local", "share", "unab-os", "tema");
const ownerId = process.env.UNAB_OS_OWNER_ID;
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ownerId || !url || !serviceRoleKey) {
  throw new Error("Set UNAB_OS_OWNER_ID, NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).");
}
if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error("UNAB_OS_OWNER_ID must be an auth.users UUID.");

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const inventory = JSON.parse(await readFile(join(root, "inventory.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "download-manifest.json"), "utf8"));
if (!Array.isArray(inventory.courses) || manifest.private !== true || !Array.isArray(manifest.files)) {
  throw new Error("The local TEMA capture is not a valid private inventory.");
}
const capturedAt = inventory.generated_at || manifest.generated_at || new Date().toISOString();

const downloadsRoot = await realpath(join(root, "downloads"));

async function upsert(table, values, onConflict) {
  for (let index = 0; index < values.length; index += 100) {
    const { error } = await supabase.from(table).upsert(values.slice(index, index + 100), { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

await upsert("tema_courses", inventory.courses.map((course) => ({
  owner_id: ownerId, source_id: String(course.id), name: course.full_name,
  access_failed: course.access_failed === true, captured_at: capturedAt, updated_at: new Date().toISOString(),
})), "owner_id,source_id");
const { data: courseRows, error: courseError } = await supabase.from("tema_courses").select("id,source_id").eq("owner_id", ownerId);
if (courseError) throw courseError;
const courseIds = new Map(courseRows.map((row) => [row.source_id, row.id]));

const sourceSections = inventory.courses.flatMap((course) => course.sections.map((section) => ({ course, section })));
await upsert("tema_sections", sourceSections.map(({ course, section }) => ({
  owner_id: ownerId, course_id: courseIds.get(String(course.id)), source_id: String(section.id),
  title: section.title, position: section.order, captured_at: capturedAt, updated_at: new Date().toISOString(),
})), "owner_id,course_id,source_id");
const { data: sectionRows, error: sectionError } = await supabase.from("tema_sections").select("id,course_id,source_id").eq("owner_id", ownerId);
if (sectionError) throw sectionError;
const courseSourceById = new Map([...courseIds].map(([source, id]) => [id, source]));
const sectionIds = new Map(sectionRows.map((row) => [`${courseSourceById.get(row.course_id)}:${row.source_id}`, row.id]));

const sourceActivities = sourceSections.flatMap(({ course, section }) =>
  (section.activities || []).map((activity, index) => ({ course, section, activity, index })));
await upsert("tema_activities", sourceActivities.map(({ course, section, activity, index }) => ({
  owner_id: ownerId,
  course_id: courseIds.get(String(course.id)),
  section_id: sectionIds.get(`${course.id}:${section.id}`),
  source_id: `${course.id}:${section.id}:${index}`,
  name: activity.name,
  module_type: activity.module_type,
  availability_text: Array.isArray(activity.availability_due_text) ? activity.availability_due_text : [],
  candidate_names: Array.isArray(activity.candidate_downloads) ? activity.candidate_downloads.map((candidate) => candidate.name) : [],
  captured_at: capturedAt,
  updated_at: new Date().toISOString(),
})), "owner_id,section_id,source_id");

let uploaded = 0;
let reused = 0;
const fileRows = [];
for (const file of manifest.files) {
  if (file.status !== "downloaded") continue;
  const normalizedRelativePath = String(file.local_relative_path).replaceAll("\\", "/");
  if (isAbsolute(normalizedRelativePath) || normalizedRelativePath.split("/").includes("..")) {
    throw new Error(`Unsafe local path: ${file.candidate_id}`);
  }
  const requestedPath = join(downloadsRoot, normalizedRelativePath);
  const metadata = await lstat(requestedPath);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size !== file.bytes) throw new Error(`Size/path mismatch: ${file.candidate_id}`);
  const sourcePath = await realpath(requestedPath);
  const withinRoot = relative(downloadsRoot, sourcePath);
  if (withinRoot === ".." || withinRoot.startsWith(`..${sep}`) || isAbsolute(withinRoot)) throw new Error(`Path escaped root: ${file.candidate_id}`);
  const bytes = await readFile(sourcePath);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== String(file.sha256).toLowerCase()) throw new Error(`SHA-256 mismatch: ${file.candidate_id}`);
  const rawFileName = file.local_relative_path.replaceAll("\\", "/").split("/").at(-1);
  const fileName = cleanDisplayFileName(rawFileName);
  const extensionMatch = fileName.match(/\.([A-Za-z0-9]{1,10})$/);
  const safeExtension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : ".bin";
  // Storage object keys stay ASCII and content-addressed. The original name is
  // preserved separately in tema_files.file_name for downloads and the UI.
  const objectName = `${ownerId}/tema/${file.candidate_id}/${digest}-${file.candidate_id}${safeExtension}`;
  const { error: uploadError } = await supabase.storage.from("tema-private").upload(objectName, bytes, {
    contentType: file.content_type,
    upsert: false,
    cacheControl: "private, max-age=0",
  });
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw new Error(`Upload failed for ${file.candidate_id}: ${uploadError.message}`);
  if (uploadError) reused += 1; else uploaded += 1;
  fileRows.push({
    owner_id: ownerId,
    candidate_id: file.candidate_id,
    course_id: courseIds.get(String(file.course.id)),
    section_id: sectionIds.get(`${file.course.id}:${file.section.id}`),
    activity_name: file.activity.name,
    file_name: fileName,
    file_type: file.file_type,
    content_type: file.content_type,
    size_bytes: file.bytes,
    sha256: digest,
    storage_bucket: "tema-private",
    storage_object_name: objectName,
    captured_at: manifest.generated_at || capturedAt,
    updated_at: new Date().toISOString(),
  });
}
await upsert("tema_files", fileRows, "owner_id,candidate_id");
process.stdout.write(JSON.stringify({ courses: inventory.courses.length, sections: sourceSections.length, activities: sourceActivities.length, files: fileRows.length, uploaded, reused }) + "\n");
