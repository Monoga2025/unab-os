import type { StudySessionStatus } from "@/lib/domain/study";

export type StudySessionDateGroup = "today" | "tomorrow" | "this_week" | "later" | "past";

export type StudyPlanSession = {
  id: string;
  title: string;
  status: StudySessionStatus;
  plannedFor: string;
  targetMinutes: number | null;
};

export type StudyPlan<T extends StudyPlanSession> = {
  activeSession: T | null;
  nextSession: T | null;
  tomorrow: T[];
  thisWeek: T[];
};

const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseInstant(value: string | Date): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error("Invalid study session date");
  return timestamp;
}

function bogotaDayIndex(timestamp: number): number {
  return Math.floor((timestamp + BOGOTA_OFFSET_MS) / DAY_MS);
}

export function classifyStudySessionDate(plannedFor: string, now: string | Date = new Date()): StudySessionDateGroup {
  const plannedDay = bogotaDayIndex(parseInstant(plannedFor));
  const today = bogotaDayIndex(parseInstant(now));
  const difference = plannedDay - today;

  if (difference < 0) return "past";
  if (difference === 0) return "today";
  if (difference === 1) return "tomorrow";

  const shiftedNow = new Date(today * DAY_MS);
  const weekday = shiftedNow.getUTCDay();
  const daysUntilMonday = weekday === 0 ? 1 : 8 - weekday;
  return difference < daysUntilMonday ? "this_week" : "later";
}

export function buildStudyPlan<T extends StudyPlanSession>(sessions: readonly T[], now: string | Date = new Date()): StudyPlan<T> {
  const byDate = (left: T, right: T) => parseInstant(left.plannedFor) - parseInstant(right.plannedFor);
  const activeSessions = sessions.filter((session) => session.status === "active").sort(byDate);
  const plannedUpcoming = sessions
    .filter((session) => session.status === "planned" && classifyStudySessionDate(session.plannedFor, now) !== "past")
    .sort(byDate);

  return {
    activeSession: activeSessions[0] ?? null,
    nextSession: activeSessions[0] ?? plannedUpcoming[0] ?? null,
    tomorrow: plannedUpcoming.filter((session) => classifyStudySessionDate(session.plannedFor, now) === "tomorrow"),
    thisWeek: plannedUpcoming.filter((session) => classifyStudySessionDate(session.plannedFor, now) === "this_week"),
  };
}
