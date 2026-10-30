import type { TemaActivity, TemaCourse, TemaData, TemaFile } from "./data";
import { classifyTemaActivity } from "./dates";

const DAY = 86_400_000;
const RECENT_ACCESS_DAYS = 60;
const FUTURE_DEADLINE_DAYS = 180;
const VERIFIED_OVERDUE_DAYS = 2;

export type TemaCourseState = "active" | "historical" | "unknown";

export type MaterialResolution =
  | Readonly<{ kind: "none"; matches: readonly [] }>
  | Readonly<{ kind: "single"; matches: readonly [TemaFile] }>
  | Readonly<{ kind: "multiple"; matches: readonly TemaFile[] }>;

export type TemaDeadline = Readonly<{
  activity: TemaActivity;
  course: TemaCourse;
  dueAt: string;
  status: "upcoming" | "overdue";
}>;

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function activityDueAt(activity: TemaActivity): string | null {
  if (activity.dueAt) return activity.dueAt;
  return classifyTemaActivity(activity.availabilityText).closesAt?.iso ?? null;
}

export function courseState(course: TemaCourse, activities: readonly TemaActivity[], now = Date.now()): TemaCourseState {
  if (course.activeState !== "unknown") return course.activeState;
  const startsAt = timestamp(course.startsAt);
  const endsAt = timestamp(course.endsAt);
  if (startsAt !== null && startsAt > now) return "unknown";
  if (endsAt !== null && endsAt >= now) return "active";

  const lastAccess = timestamp(course.lastAccessAt);
  if (lastAccess !== null && lastAccess >= now - RECENT_ACCESS_DAYS * DAY) return "active";

  const hasRelevantDeadline = activities.some((activity) => {
    const dueAt = timestamp(activityDueAt(activity));
    return dueAt !== null
      && dueAt >= now
      && dueAt <= now + FUTURE_DEADLINE_DAYS * DAY;
  });
  if (hasRelevantDeadline) return "active";
  if (endsAt !== null && endsAt < now) return "historical";
  return "unknown";
}

export function splitTemaCourses(data: TemaData, now = Date.now()) {
  const stateByCourse = new Map<string, TemaCourseState>();
  for (const course of data.courses) {
    stateByCourse.set(course.id, courseState(course, data.activities.filter((activity) => activity.courseId === course.id), now));
  }
  return {
    active: data.courses.filter((course) => stateByCourse.get(course.id) === "active"),
    other: data.courses.filter((course) => stateByCourse.get(course.id) !== "active"),
    stateByCourse,
  } as const;
}

export function prioritizedDeadlines(data: TemaData, now = Date.now(), limit = 5): TemaDeadline[] {
  const { stateByCourse } = splitTemaCourses(data, now);
  const courseById = new Map(data.courses.map((course) => [course.id, course]));
  return data.activities.flatMap((activity): TemaDeadline[] => {
    if (stateByCourse.get(activity.courseId) !== "active") return [];
    if (activity.completionState === "submitted" || activity.completionState === "graded") return [];
    const course = courseById.get(activity.courseId);
    const dueAt = activityDueAt(activity);
    if (!course || !dueAt) return [];
    const due = Date.parse(dueAt);
    if (!Number.isFinite(due) || due > now + 30 * DAY) return [];
    if (due < now && (activity.completionState !== "pending" || due < now - VERIFIED_OVERDUE_DAYS * DAY)) return [];
    return [{ activity, course, dueAt, status: due < now ? "overdue" : "upcoming" }];
  }).sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt)).slice(0, limit);
}

export function normalizeStudyQuery(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/\b(necesito|quiero|debo|para|estudiar|practicar|repasar|material|archivo|pdf|curso|materia|por|favor)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreMaterial(query: string, file: TemaFile, courseName: string): number {
  if (!query) return 0;
  const tokens = query.split(/\s+/).filter((token) => token.length > 1);
  const course = normalizeStudyQuery(courseName);
  const activity = normalizeStudyQuery(file.activityName);
  const name = normalizeStudyQuery(file.fileName);
  let score = 0;
  for (const token of tokens) {
    if (course.includes(token)) score += 8;
    if (activity.includes(token)) score += 4;
    if (name.includes(token)) score += 2;
  }
  if (course === query) score += 20;
  return score;
}

export function resolveStudyMaterial(data: TemaData, request: string, courseId?: string): MaterialResolution {
  const query = normalizeStudyQuery(request);
  const courseById = new Map(data.courses.map((course) => [course.id, course.name]));
  const ranked = data.files
    .filter((file) => file.contentType === "application/pdf" && file.bytes > 0 && file.bytes <= 10_000_000)
    .filter((file) => !courseId || file.courseId === courseId)
    .map((file) => ({ file, score: scoreMaterial(query, file, courseById.get(file.courseId) ?? "") }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.file.fileName.localeCompare(right.file.fileName, "es"));
  if (!ranked.length) return { kind: "none", matches: [] };
  const best = ranked[0].score;
  const matches = ranked.filter((entry) => entry.score >= Math.max(2, best - 3)).slice(0, 6).map((entry) => entry.file);
  return matches.length === 1
    ? { kind: "single", matches: [matches[0]] }
    : { kind: "multiple", matches };
}
