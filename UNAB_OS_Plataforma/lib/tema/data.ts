import "server-only";

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const MAX_JSON_BYTES = 25 * 1024 * 1024;
const MAX_STRING_LENGTH = 16_384;
const MAX_COURSES = 100;
const MAX_SECTIONS = 5_000;
const MAX_ACTIVITIES = 50_000;
const MAX_FILES = 10_000;

export type TemaCourse = Readonly<{
  id: string;
  name: string;
  accessFailed: boolean;
  startsAt: string | null;
  endsAt: string | null;
  lastAccessAt: string | null;
  activeState: "active" | "historical" | "unknown";
  shortName?: string | null;
  officialUrl?: string | null;
  summaryText?: string | null;
  categoryName?: string | null;
  progressPercent?: number | null;
}>;

export type TemaSection = Readonly<{
  id: string;
  courseId: string;
  title: string;
  order: number;
}>;

export type TemaActivity = Readonly<{
  id: string;
  courseId: string;
  sectionId: string;
  name: string;
  moduleType: string;
  availabilityText: readonly string[];
  candidateNames: readonly string[];
  opensAt: string | null;
  dueAt: string | null;
  completionState: "unknown" | "pending" | "submitted" | "graded";
  officialUrl?: string | null;
  descriptionText?: string | null;
  visible?: boolean;
}>;

export type TemaFile = Readonly<{
  candidateId: string;
  courseId: string;
  sectionId: string;
  activityName: string;
  fileName: string;
  fileType: string;
  contentType: string;
  bytes: number;
  sha256: string;
  status: "downloaded";
  localRelativePath: string;
  extractedText: string | null;
  textExtractionStatus: "not_extracted" | "ready" | "ocr_needed" | "unsupported" | "failed";
  activityId?: string | null;
}>;

export type TemaGradeItem = Readonly<{
  id: string;
  courseId: string;
  name: string;
  itemType: string;
  moduleType: string | null;
  gradeDisplay: string | null;
  gradeRaw: number | null;
  gradeMin: number | null;
  gradeMax: number | null;
  feedbackText: string | null;
  gradedAt: string | null;
  officialUrl: string | null;
}>;

export type TemaAnnouncement = Readonly<{
  id: string;
  courseId: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  postedAt: string | null;
  officialUrl: string;
}>;

export type TemaData = Readonly<{
  courses: readonly TemaCourse[];
  sections: readonly TemaSection[];
  activities: readonly TemaActivity[];
  files: readonly TemaFile[];
  grades?: readonly TemaGradeItem[];
  announcements?: readonly TemaAnnouncement[];
}>;

const EMPTY_TEMA_DATA: TemaData = Object.freeze({
  courses: Object.freeze([]),
  sections: Object.freeze([]),
  activities: Object.freeze([]),
  files: Object.freeze([]),
  grades: Object.freeze([]),
  announcements: Object.freeze([]),
});

type JsonRecord = Record<string, unknown>;

type CacheEntry = Readonly<{
  inventoryMtimeMs: number;
  manifestMtimeMs: number;
  data: TemaData;
}>;

const cache = new Map<string, CacheEntry>();

function record(value: unknown, context: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid TEMA ${context}.`);
  return value as JsonRecord;
}

function array(value: unknown, context: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`Invalid TEMA ${context}.`);
  return value;
}

function string(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_STRING_LENGTH || value.includes("\0")) {
    throw new Error(`Invalid TEMA ${context}.`);
  }
  return value;
}

function optionalStrings(value: unknown, context: string): string[] {
  if (value === undefined) return [];
  return array(value, context, 100).map((item) => string(item, context));
}

function finiteNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid TEMA ${context}.`);
  return value;
}

function parseInventory(value: unknown): Pick<TemaData, "courses" | "sections" | "activities"> {
  const root = record(value, "inventory");
  const rawCourses = array(root.courses, "courses", MAX_COURSES);
  const courses: TemaCourse[] = [];
  const sections: TemaSection[] = [];
  const activities: TemaActivity[] = [];
  const courseIds = new Set<string>();

  for (const rawCourse of rawCourses) {
    const course = record(rawCourse, "course");
    const courseId = string(course.id, "course id");
    if (courseIds.has(courseId)) throw new Error("Invalid duplicate TEMA course id.");
    courseIds.add(courseId);
    courses.push({
      id: courseId,
      name: string(course.full_name, "course name"),
      accessFailed: course.access_failed === true,
      startsAt: null,
      endsAt: null,
      lastAccessAt: null,
      activeState: "unknown",
    });

    const rawSections = array(course.sections, "sections", MAX_SECTIONS - sections.length);
    const sectionIds = new Set<string>();
    for (const rawSection of rawSections) {
      const section = record(rawSection, "section");
      const sectionId = string(section.id, "section id");
      if (sectionIds.has(sectionId)) throw new Error("Invalid duplicate TEMA section id.");
      sectionIds.add(sectionId);
      sections.push({
        id: sectionId,
        courseId,
        title: string(section.title, "section title"),
        order: finiteNumber(section.order, "section order"),
      });

      const rawActivities = array(section.activities, "activities", MAX_ACTIVITIES - activities.length);
      rawActivities.forEach((rawActivity, index) => {
        const activity = record(rawActivity, "activity");
        const rawCandidates = array(activity.candidate_downloads ?? [], "candidate downloads", 1_000);
        activities.push({
          id: `${courseId}:${sectionId}:${index}`,
          courseId,
          sectionId,
          name: string(activity.name, "activity name"),
          moduleType: string(activity.module_type, "activity module type"),
          availabilityText: optionalStrings(activity.availability_due_text, "availability text"),
          opensAt: null,
          dueAt: null,
          completionState: "unknown",
          candidateNames: rawCandidates.map((rawCandidate) => {
            const candidate = record(rawCandidate, "candidate download");
            return string(candidate.name, "candidate name");
          }),
        });
      });
    }
  }
  return { courses, sections, activities };
}

function safeFileName(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const name = normalized.slice(normalized.lastIndexOf("/") + 1);
  return string(name, "file name");
}

function parseManifest(value: unknown): readonly TemaFile[] {
  const root = record(value, "download manifest");
  if (root.private !== true) throw new Error("Invalid public TEMA download manifest.");
  const rawFiles = array(root.files, "manifest files", MAX_FILES);
  const candidateIds = new Set<string>();

  return rawFiles.map((rawFile) => {
    const file = record(rawFile, "manifest file");
    const candidateId = string(file.candidate_id, "candidate id");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(candidateId) || candidateIds.has(candidateId)) {
      throw new Error("Invalid TEMA candidate id.");
    }
    candidateIds.add(candidateId);

    const status = string(file.status, "file status");
    if (status !== "downloaded") throw new Error("Invalid undownloaded TEMA manifest entry.");
    const localRelativePath = string(file.local_relative_path, "local relative path");
    if (isAbsolute(localRelativePath) || localRelativePath.replace(/\\/g, "/").split("/").includes("..")) {
      throw new Error("Invalid TEMA local relative path.");
    }

    const course = record(file.course, "file course");
    const section = record(file.section, "file section");
    const activity = record(file.activity, "file activity");
    const bytes = finiteNumber(file.bytes, "file bytes");
    const sha256 = string(file.sha256, "file digest");
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !/^[a-f0-9]{64}$/i.test(sha256)) {
      throw new Error("Invalid TEMA file integrity metadata.");
    }

    return {
      candidateId,
      courseId: string(course.id, "file course id"),
      sectionId: string(section.id, "file section id"),
      activityName: string(activity.name, "file activity name"),
      fileName: safeFileName(localRelativePath),
      fileType: string(file.file_type, "file type"),
      contentType: string(file.content_type, "file content type"),
      bytes,
      sha256: sha256.toLowerCase(),
      status: "downloaded" as const,
      localRelativePath,
      extractedText: null,
      textExtractionStatus: "not_extracted" as const,
    };
  });
}

async function readBoundedJson(path: string): Promise<unknown> {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size > MAX_JSON_BYTES) throw new Error("Invalid TEMA data file.");
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export function getTemaDataRoot(): string {
  const override = process.env.TEMA_DATA_ROOT;
  return override ? override : join(homedir(), ".local", "share", "unab-os", "tema");
}

export function getTemaDownloadsRoot(): string {
  return join(getTemaDataRoot(), "downloads");
}

async function loadLocalTemaData(): Promise<TemaData> {
  try {
    const root = getTemaDataRoot();
    const inventoryPath = join(root, "inventory.json");
    const manifestPath = join(root, "download-manifest.json");
    const [inventoryStat, manifestStat] = await Promise.all([stat(inventoryPath), stat(manifestPath)]);
    const cached = cache.get(root);
    if (cached
      && cached.inventoryMtimeMs === inventoryStat.mtimeMs
      && cached.manifestMtimeMs === manifestStat.mtimeMs) return cached.data;

    const [inventoryJson, manifestJson] = await Promise.all([
      readBoundedJson(inventoryPath),
      readBoundedJson(manifestPath),
    ]);
    const inventory = parseInventory(inventoryJson);
    const data: TemaData = Object.freeze({ ...inventory, files: parseManifest(manifestJson) });
    cache.set(root, { inventoryMtimeMs: inventoryStat.mtimeMs, manifestMtimeMs: manifestStat.mtimeMs, data });
    return data;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return EMPTY_TEMA_DATA;
    throw error;
  }
}

export async function loadTemaData(ownerId?: string): Promise<TemaData> {
  const isDanielMonoga = ownerId === "00000000-0000-0000-0000-000000000002";

  if (ownerId && process.env.TEMA_DATA_SOURCE !== "local" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const [{ createClient }, { loadCloudTemaData }] = await Promise.all([
      import("@/lib/supabase/server"),
      import("./cloud"),
    ]);
    const cloudData = await loadCloudTemaData(await createClient(), ownerId);
    if (cloudData.courses.length > 0 || !isDanielMonoga) {
      return cloudData;
    }
  }

  if (isDanielMonoga || (!ownerId && process.env.NODE_ENV === "test")) {
    return loadLocalTemaData();
  }

  return EMPTY_TEMA_DATA;
}

export async function getTemaCourses(ownerId?: string): Promise<readonly TemaCourse[]> {
  return (await loadTemaData(ownerId)).courses;
}

export async function getTemaCourse(courseId: string, ownerId?: string): Promise<TemaCourse | null> {
  return (await loadTemaData(ownerId)).courses.find((course) => course.id === courseId) ?? null;
}

export async function getTemaSections(courseId: string, ownerId?: string): Promise<readonly TemaSection[]> {
  return (await loadTemaData(ownerId)).sections.filter((section) => section.courseId === courseId);
}

export async function getTemaSection(courseId: string, sectionId: string, ownerId?: string): Promise<TemaSection | null> {
  return (await loadTemaData(ownerId)).sections.find(
    (section) => section.courseId === courseId && section.id === sectionId,
  ) ?? null;
}

export async function getTemaActivities(courseId: string, sectionId?: string, ownerId?: string): Promise<readonly TemaActivity[]> {
  return (await loadTemaData(ownerId)).activities.filter(
    (activity) => activity.courseId === courseId && (!sectionId || activity.sectionId === sectionId),
  );
}

export async function getTemaActivity(activityId: string, ownerId?: string): Promise<TemaActivity | null> {
  return (await loadTemaData(ownerId)).activities.find((activity) => activity.id === activityId) ?? null;
}

export async function getTemaFileByCandidateId(candidateId: string, ownerId?: string): Promise<TemaFile | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(candidateId)) return null;
  return (await loadTemaData(ownerId)).files.find((file) => file.candidateId === candidateId) ?? null;
}
