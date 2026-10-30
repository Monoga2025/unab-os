import { describe, expect, it } from "vitest";
import { aggregateProgress } from "@/lib/domain/progress";

const objectives = [
  { id: "mastered", title: "Mastered objective", topicTitle: "Topic A", courseId: "course-a", courseTitle: "Course A" },
  { id: "due-low", title: "Due low objective", topicTitle: "Topic B", courseId: "course-a", courseTitle: "Course A" },
  { id: "due-high", title: "Due high objective", topicTitle: "Topic C", courseId: "course-b", courseTitle: "Course B" },
  { id: "practicing", title: "Practicing objective", topicTitle: "Topic D", courseId: "course-b", courseTitle: "Course B" },
  { id: "unseen", title: "Unseen objective", topicTitle: "Topic E", courseId: "course-b", courseTitle: "Course B" },
];

const mastery = [
  { objectiveId: "mastered", level: 4, reviewDueAt: "2026-09-01T00:00:00.000Z" },
  { objectiveId: "due-low", level: 1, reviewDueAt: "2026-08-10T00:00:00.000Z" },
  { objectiveId: "due-high", level: 3, reviewDueAt: "2026-08-09T00:00:00.000Z" },
  { objectiveId: "practicing", level: 2, reviewDueAt: "2026-09-02T00:00:00.000Z" },
];

const attempts = [
  { objectiveId: "mastered", correct: true, helpLevel: "none" as const, at: "2026-08-12T10:00:00.000Z" },
  { objectiveId: "due-low", correct: false, helpLevel: "none" as const, at: "2026-08-13T10:00:00.000Z" },
  { objectiveId: "due-low", correct: true, helpLevel: "hint" as const, at: "2026-08-13T11:00:00.000Z" },
  { objectiveId: "due-high", correct: true, helpLevel: "none" as const, at: "2026-08-14T10:00:00.000Z" },
  { objectiveId: "practicing", correct: false, helpLevel: "none" as const, at: "2026-08-14T11:00:00.000Z" },
  { objectiveId: "practicing", correct: true, helpLevel: "none" as const, at: "2026-08-14T12:00:00.000Z" },
];

describe("progress aggregation", () => {
  it("calculates accuracy only from independent attempts and counts mastered and due reviews", () => {
    const progress = aggregateProgress({ objectives, attempts, mastery, now: "2026-08-15T00:00:00.000Z" });

    expect(progress.summary).toEqual({
      accuracy: 60,
      independentAttempts: 5,
      correctIndependentAttempts: 3,
      masteredCount: 1,
      reviewCount: 2,
      objectiveCount: 5,
      masteryPercent: 50,
    });
  });

  it("assigns honest objective statuses from current evidence and review dates", () => {
    const progress = aggregateProgress({ objectives, attempts, mastery, now: "2026-08-15T00:00:00.000Z" });
    const statuses = Object.fromEntries(progress.objectives.map((objective) => [objective.id, objective.status]));

    expect(statuses).toEqual({
      mastered: "mastered",
      "due-low": "review",
      "due-high": "review",
      practicing: "practicing",
      unseen: "not-started",
    });
    expect(progress.objectives.find((objective) => objective.id === "due-low")?.accuracy).toBe(0);
    expect(progress.objectives.find((objective) => objective.id === "unseen")?.accuracy).toBeNull();
  });

  it("prioritizes overdue reviews by due date and weak objectives by mastery then accuracy", () => {
    const progress = aggregateProgress({ objectives, attempts, mastery, now: "2026-08-15T00:00:00.000Z" });

    expect(progress.reviewQueue.map((objective) => objective.id)).toEqual(["due-high", "due-low"]);
    expect(progress.weakObjectives.map((objective) => objective.id)).toEqual(["due-low", "practicing", "due-high"]);
    expect(progress.strongObjectives.map((objective) => objective.id)).toEqual(["mastered", "due-high", "practicing"]);
  });

  it("returns zeroed metrics without inventing accuracy when no evidence exists", () => {
    const progress = aggregateProgress({ objectives: objectives.slice(-1), attempts: [], mastery: [], now: "2026-08-15T00:00:00.000Z" });

    expect(progress.summary).toEqual({
      accuracy: null,
      independentAttempts: 0,
      correctIndependentAttempts: 0,
      masteredCount: 0,
      reviewCount: 0,
      objectiveCount: 1,
      masteryPercent: 0,
    });
    expect(progress.reviewQueue).toEqual([]);
    expect(progress.weakObjectives).toEqual([]);
    expect(progress.strongObjectives).toEqual([]);
  });
});
