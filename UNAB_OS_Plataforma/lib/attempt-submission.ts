import type { HelpLevel } from "./domain/learning";

export type AttemptSubmission = {
  objectiveId: string;
  exerciseVersionId: string;
  idempotencyKey: string;
  correct: boolean;
  helpLevel: HelpLevel;
};

const helpLevels = new Set<HelpLevel>(["none", "diagnosis", "hint", "solution"]);

export function parseAttemptSubmission(formData: FormData): AttemptSubmission | null {
  const objectiveId = formData.get("objectiveId");
  const exerciseVersionId = formData.get("exerciseVersionId");
  const idempotencyKey = formData.get("idempotencyKey");
  const correct = formData.get("correct");
  const helpLevel = formData.get("helpLevel");

  if (
    typeof objectiveId !== "string" ||
    typeof exerciseVersionId !== "string" ||
    typeof idempotencyKey !== "string" ||
    typeof correct !== "string" ||
    typeof helpLevel !== "string" ||
    !objectiveId || !exerciseVersionId || !idempotencyKey ||
    !["true", "false"].includes(correct) ||
    !helpLevels.has(helpLevel as HelpLevel)
  ) return null;

  return { objectiveId, exerciseVersionId, idempotencyKey, correct: correct === "true", helpLevel: helpLevel as HelpLevel };
}
