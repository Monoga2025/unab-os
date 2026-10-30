export type ProgressHelpLevel = "none" | "diagnosis" | "hint" | "solution";

export type ProgressObjectiveInput = {
  id: string;
  title: string;
  topicTitle: string;
  courseId: string;
  courseTitle: string;
};

export type ProgressAttemptInput = {
  objectiveId: string;
  correct: boolean;
  helpLevel: ProgressHelpLevel;
  at: string;
};

export type ProgressMasteryInput = {
  objectiveId: string;
  level: number;
  reviewDueAt: string;
};

export type ProgressObjectiveStatus = "mastered" | "review" | "practicing" | "not-started";

export type ProgressObjective = ProgressObjectiveInput & {
  level: number;
  masteryPercent: number;
  status: ProgressObjectiveStatus;
  reviewDueAt: string | null;
  attemptCount: number;
  independentAttemptCount: number;
  correctIndependentAttempts: number;
  accuracy: number | null;
  lastAttemptAt: string | null;
};

export type ProgressAggregation = {
  summary: {
    accuracy: number | null;
    independentAttempts: number;
    correctIndependentAttempts: number;
    masteredCount: number;
    reviewCount: number;
    objectiveCount: number;
    masteryPercent: number;
  };
  objectives: ProgressObjective[];
  reviewQueue: ProgressObjective[];
  weakObjectives: ProgressObjective[];
  strongObjectives: ProgressObjective[];
};

function clampLevel(level: number) {
  return Math.max(0, Math.min(4, Math.round(level)));
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

function isDue(reviewDueAt: string | null, now: number) {
  if (!reviewDueAt) return false;
  const dueAt = Date.parse(reviewDueAt);
  return !Number.isNaN(dueAt) && dueAt <= now;
}

export function aggregateProgress(input: {
  objectives: ProgressObjectiveInput[];
  attempts: ProgressAttemptInput[];
  mastery: ProgressMasteryInput[];
  now: string;
}): ProgressAggregation {
  const now = Date.parse(input.now);
  if (Number.isNaN(now)) throw new Error("Invalid progress aggregation timestamp");

  const masteryByObjective = new Map(input.mastery.map((entry) => [entry.objectiveId, entry]));
  const attemptsByObjective = new Map<string, ProgressAttemptInput[]>();
  for (const attempt of input.attempts) {
    attemptsByObjective.set(attempt.objectiveId, [...(attemptsByObjective.get(attempt.objectiveId) ?? []), attempt]);
  }

  const objectives = input.objectives.map((objective): ProgressObjective => {
    const objectiveAttempts = attemptsByObjective.get(objective.id) ?? [];
    const independentAttempts = objectiveAttempts.filter((attempt) => attempt.helpLevel === "none");
    const correctIndependentAttempts = independentAttempts.filter((attempt) => attempt.correct).length;
    const mastery = masteryByObjective.get(objective.id);
    const level = clampLevel(mastery?.level ?? 0);
    const reviewDueAt = mastery?.reviewDueAt ?? null;
    const due = isDue(reviewDueAt, now);
    const status: ProgressObjectiveStatus = due
      ? "review"
      : level === 4
        ? "mastered"
        : level > 0 || objectiveAttempts.length > 0
          ? "practicing"
          : "not-started";
    const lastAttemptAt = objectiveAttempts.reduce<string | null>(
      (latest, attempt) => latest === null || attempt.at > latest ? attempt.at : latest,
      null,
    );

    return {
      ...objective,
      level,
      masteryPercent: level * 25,
      status,
      reviewDueAt,
      attemptCount: objectiveAttempts.length,
      independentAttemptCount: independentAttempts.length,
      correctIndependentAttempts,
      accuracy: percent(correctIndependentAttempts, independentAttempts.length),
      lastAttemptAt,
    };
  });

  const independentAttempts = input.attempts.filter((attempt) => attempt.helpLevel === "none");
  const correctIndependentAttempts = independentAttempts.filter((attempt) => attempt.correct).length;
  const masteryPoints = objectives.reduce((sum, objective) => sum + objective.level, 0);
  const reviewQueue = objectives
    .filter((objective) => objective.status === "review")
    .sort((a, b) => (a.reviewDueAt ?? "").localeCompare(b.reviewDueAt ?? "") || a.level - b.level || a.title.localeCompare(b.title));
  const evidenced = objectives.filter((objective) => objective.independentAttemptCount > 0);
  const weakObjectives = evidenced
    .filter((objective) => objective.level < 4)
    .sort((a, b) => a.level - b.level || (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.title.localeCompare(b.title));
  const strongObjectives = [...evidenced]
    .sort((a, b) => b.level - a.level || (b.accuracy ?? -1) - (a.accuracy ?? -1) || a.title.localeCompare(b.title))
    .slice(0, 3);

  return {
    summary: {
      accuracy: percent(correctIndependentAttempts, independentAttempts.length),
      independentAttempts: independentAttempts.length,
      correctIndependentAttempts,
      masteredCount: objectives.filter((objective) => objective.level === 4).length,
      reviewCount: reviewQueue.length,
      objectiveCount: objectives.length,
      masteryPercent: objectives.length ? Math.round((masteryPoints / (objectives.length * 4)) * 100) : 0,
    },
    objectives,
    reviewQueue,
    weakObjectives,
    strongObjectives,
  };
}
