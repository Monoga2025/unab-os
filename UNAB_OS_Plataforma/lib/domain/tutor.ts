export const tutorPolicy = {
  maxRequestCharacters: 2_000,
  maxReplyCharacters: 12_000,
  maxEvidenceSummaryCharacters: 4_000,
  maxRecommendedTopicCharacters: 160,
} as const;

export type TutorMode = "concept" | "exercise";

export type TutorRequest = {
  request: string;
  mode: TutorMode;
};

export type TutorConfidence = "low" | "medium" | "high";

/** A tutor observation only. The backend remains authoritative for mastery state. */
export type ObservedMasterySignal =
  | "not_observed"
  | "needs_support"
  | "developing"
  | "demonstrated";

export type TutorSuggestedNextAction =
  | "continue_topic"
  | "practice"
  | "review"
  | "switch_topic"
  | "break";

export type TutorAssistantResult = {
  reply: string;
  evidenceSummary: string;
  confidence: TutorConfidence;
  observedMasterySignal: ObservedMasterySignal;
  suggestedNextAction: TutorSuggestedNextAction;
  recommendedTopic?: string;
};

export type TutorRequestValidationResult =
  | { valid: true; value: TutorRequest }
  | { valid: false; reason: "invalid_request" | "request_too_long" | "invalid_mode" };

export type TutorAssistantResultValidationResult =
  | { valid: true; value: TutorAssistantResult }
  | {
    valid: false;
    reason:
      | "invalid_result"
      | "invalid_reply"
      | "invalid_evidence_summary"
      | "invalid_confidence"
      | "invalid_mastery_signal"
      | "invalid_next_action"
      | "invalid_recommended_topic";
  };

const confidenceValues: readonly TutorConfidence[] = ["low", "medium", "high"];
const masterySignalValues: readonly ObservedMasterySignal[] = [
  "not_observed",
  "needs_support",
  "developing",
  "demonstrated",
];
const nextActionValues: readonly TutorSuggestedNextAction[] = [
  "continue_topic",
  "practice",
  "review",
  "switch_topic",
  "break",
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedTrimmedString(value: unknown, maxCharacters: number): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= maxCharacters
    && value === value.trim();
}

export function validateTutorRequest(input: unknown): TutorRequestValidationResult {
  if (!isPlainRecord(input) || Object.keys(input).some((key) => key !== "request" && key !== "mode")) {
    return { valid: false, reason: "invalid_request" };
  }
  if (typeof input.request === "string" && input.request.length > tutorPolicy.maxRequestCharacters) {
    return { valid: false, reason: "request_too_long" };
  }
  if (!isBoundedTrimmedString(input.request, tutorPolicy.maxRequestCharacters)) {
    return { valid: false, reason: "invalid_request" };
  }
  if (input.mode !== "concept" && input.mode !== "exercise") {
    return { valid: false, reason: "invalid_mode" };
  }
  return { valid: true, value: { request: input.request, mode: input.mode } };
}

export function validateTutorAssistantResult(input: unknown): TutorAssistantResultValidationResult {
  if (!isPlainRecord(input)) return { valid: false, reason: "invalid_result" };

  const allowedKeys = new Set([
    "reply",
    "evidenceSummary",
    "confidence",
    "observedMasterySignal",
    "suggestedNextAction",
    "recommendedTopic",
  ]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { valid: false, reason: "invalid_result" };
  }
  if (!isBoundedTrimmedString(input.reply, tutorPolicy.maxReplyCharacters)) {
    return { valid: false, reason: "invalid_reply" };
  }
  if (!isBoundedTrimmedString(input.evidenceSummary, tutorPolicy.maxEvidenceSummaryCharacters)) {
    return { valid: false, reason: "invalid_evidence_summary" };
  }
  if (!confidenceValues.includes(input.confidence as TutorConfidence)) {
    return { valid: false, reason: "invalid_confidence" };
  }
  if (!masterySignalValues.includes(input.observedMasterySignal as ObservedMasterySignal)) {
    return { valid: false, reason: "invalid_mastery_signal" };
  }
  if (!nextActionValues.includes(input.suggestedNextAction as TutorSuggestedNextAction)) {
    return { valid: false, reason: "invalid_next_action" };
  }
  if (input.recommendedTopic !== undefined
    && !isBoundedTrimmedString(input.recommendedTopic, tutorPolicy.maxRecommendedTopicCharacters)) {
    return { valid: false, reason: "invalid_recommended_topic" };
  }

  const value: TutorAssistantResult = {
    reply: input.reply,
    evidenceSummary: input.evidenceSummary,
    confidence: input.confidence as TutorConfidence,
    observedMasterySignal: input.observedMasterySignal as ObservedMasterySignal,
    suggestedNextAction: input.suggestedNextAction as TutorSuggestedNextAction,
  };
  if (input.recommendedTopic !== undefined) value.recommendedTopic = input.recommendedTopic;

  return { valid: true, value };
}
