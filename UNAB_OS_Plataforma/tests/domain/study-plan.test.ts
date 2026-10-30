import { describe, expect, it } from "vitest";
import { buildStudyPlan, classifyStudySessionDate } from "@/lib/domain/study-plan";

const now = "2024-06-12T17:00:00.000Z"; // Wednesday at noon in America/Bogota.

describe("classifyStudySessionDate", () => {
  it("uses America/Bogota day boundaries", () => {
    expect(classifyStudySessionDate("2024-06-12T04:59:59.999Z", now)).toBe("past");
    expect(classifyStudySessionDate("2024-06-12T05:00:00.000Z", now)).toBe("today");
    expect(classifyStudySessionDate("2024-06-13T04:59:59.999Z", now)).toBe("today");
    expect(classifyStudySessionDate("2024-06-13T05:00:00.000Z", now)).toBe("tomorrow");
  });

  it("ends this_week at Sunday 23:59:59.999 in America/Bogota", () => {
    expect(classifyStudySessionDate("2024-06-14T15:00:00.000Z", now)).toBe("this_week");
    expect(classifyStudySessionDate("2024-06-17T04:59:59.999Z", now)).toBe("this_week");
    expect(classifyStudySessionDate("2024-06-17T05:00:00.000Z", now)).toBe("later");
  });
});

describe("buildStudyPlan", () => {
  it("excludes completed, cancelled, and past planned sessions from upcoming groups", () => {
    const plan = buildStudyPlan([
      { id: "tomorrow", title: "Tomorrow", status: "planned", plannedFor: "2024-06-13T15:00:00.000Z", targetMinutes: 30 },
      { id: "week", title: "Week", status: "planned", plannedFor: "2024-06-14T15:00:00.000Z", targetMinutes: null },
      { id: "past", title: "Past", status: "planned", plannedFor: "2024-06-11T15:00:00.000Z", targetMinutes: 20 },
      { id: "done", title: "Done", status: "completed", plannedFor: "2024-06-13T14:00:00.000Z", targetMinutes: 20 },
      { id: "cancelled", title: "Cancelled", status: "cancelled", plannedFor: "2024-06-14T14:00:00.000Z", targetMinutes: 20 },
    ], now);

    expect(plan.tomorrow.map((session) => session.id)).toEqual(["tomorrow"]);
    expect(plan.thisWeek.map((session) => session.id)).toEqual(["week"]);
    expect(plan.nextSession?.id).toBe("tomorrow");
  });

  it("surfaces an active session before earlier planned sessions", () => {
    const plan = buildStudyPlan([
      { id: "planned", title: "Planned", status: "planned", plannedFor: "2024-06-12T18:00:00.000Z", targetMinutes: 25 },
      { id: "active", title: "Active", status: "active", plannedFor: "2024-06-10T15:00:00.000Z", targetMinutes: 45 },
    ], now);

    expect(plan.nextSession?.id).toBe("active");
    expect(plan.activeSession?.id).toBe("active");
  });
});
