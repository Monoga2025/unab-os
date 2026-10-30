export type HelpLevel = "none" | "diagnosis" | "hint" | "solution";
export type AttemptEvidence = { objectiveId: string; correct: boolean; helpLevel: HelpLevel; version: string; at: string; painPoint?: string };

const independent = (attempt: AttemptEvidence) => attempt.helpLevel === "none";
const latestIndependent = (attempts: AttemptEvidence[]) => attempts.filter(independent).sort((a, b) => b.at.localeCompare(a.at))[0];

export function deriveMastery(attempts: AttemptEvidence[], m4Eligible: boolean) {
  const evidence = attempts.filter(independent);
  const correct = evidence.filter((attempt) => attempt.correct);
  const slots = new Set(correct.map((attempt) => attempt.version));
  const days = new Set(correct.map((attempt) => attempt.at.slice(0, 10)));
  const m4 = m4Eligible && slots.size >= 2 && days.size >= 2;
  const level = m4 ? 4 : correct.length >= 1 ? 3 : evidence.length >= 2 ? 2 : evidence.length ? 1 : 0;
  return { level, reviewDueAt: level >= 4 ? "2026-02-01T00:00:00.000Z" : level === 3 ? "2026-01-08T00:00:00.000Z" : "2026-01-02T00:00:00.000Z" };
}

export function calculateDashboard(attempts: AttemptEvidence[], objectiveIds: string[]) {
  const latest = objectiveIds.map((objectiveId) => ({ objectiveId, attempt: latestIndependent(attempts.filter((item) => item.objectiveId === objectiveId)) }));
  const eligible = latest.filter((entry) => entry.attempt);
  const numerator = eligible.filter((entry) => entry.attempt!.correct).length;
  const painPoints = attempts.filter((item) => !item.correct && item.painPoint).map((item) => item.painPoint!);
  return {
    northStar: { numerator, denominator: eligible.length, value: eligible.length ? numerator / eligible.length : 0 },
    coverage: eligible.length, retention: eligible.filter((entry) => entry.attempt!.correct).length,
    difficulty: attempts.filter((item) => !item.correct).length, painPoints,
    missingIndependentEvidence: latest.filter((entry) => !entry.attempt).map((entry) => entry.objectiveId),
  };
}
