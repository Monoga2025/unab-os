import { describe, expect, it } from "vitest";
import {
  tutorPolicy,
  validateTutorAssistantResult,
  validateTutorRequest,
  type TutorAssistantResult,
} from "@/lib/domain/tutor";

describe("tutor request validation", () => {
  it.each([1, tutorPolicy.maxRequestCharacters])(
    "accepts trimmed concept requests at the inclusive %s-character boundary",
    (length) => {
      expect(validateTutorRequest({ request: "x".repeat(length), mode: "concept" })).toEqual({
        valid: true,
        value: { request: "x".repeat(length), mode: "concept" },
      });
    },
  );

  it("accepts explicit exercise review mode", () => {
    expect(validateTutorRequest({ request: "Review my attempt", mode: "exercise" })).toEqual({
      valid: true,
      value: { request: "Review my attempt", mode: "exercise" },
    });
  });

  it.each([
    [{ request: "", mode: "concept" }, "invalid_request"],
    [{ request: " leading", mode: "concept" }, "invalid_request"],
    [{ request: "x".repeat(tutorPolicy.maxRequestCharacters + 1), mode: "concept" }, "request_too_long"],
    [{ request: 42, mode: "concept" }, "invalid_request"],
    [{ request: "Explain vectors" }, "invalid_mode"],
    [{ request: "Explain vectors", mode: "homework" }, "invalid_mode"],
  ] as const)("rejects invalid bounded requests with %s", (input, reason) => {
    expect(validateTutorRequest(input)).toEqual({ valid: false, reason });
  });
});

describe("structured tutor assistant result validation", () => {
  const validResult: TutorAssistantResult = {
    reply: "Use the chain rule, then simplify the inner derivative.",
    evidenceSummary: "The learner selected the right rule but omitted the inner derivative.",
    confidence: "high",
    observedMasterySignal: "developing",
    suggestedNextAction: "practice",
    recommendedTopic: "Chain rule",
  };

  it("accepts a bounded result that keeps mastery as an observed signal", () => {
    expect(validateTutorAssistantResult(validResult)).toEqual({ valid: true, value: validResult });
  });

  it.each([
    [{ ...validResult, reply: "" }, "invalid_reply"],
    [{ ...validResult, evidenceSummary: "x".repeat(tutorPolicy.maxEvidenceSummaryCharacters + 1) }, "invalid_evidence_summary"],
    [{ ...validResult, confidence: "certain" }, "invalid_confidence"],
    [{ ...validResult, observedMasterySignal: "mastered" }, "invalid_mastery_signal"],
    [{ ...validResult, suggestedNextAction: "finish_course" }, "invalid_next_action"],
    [{ ...validResult, recommendedTopic: "x".repeat(tutorPolicy.maxRecommendedTopicCharacters + 1) }, "invalid_recommended_topic"],
  ] as const)("rejects malformed structured results with %s", (input, reason) => {
    expect(validateTutorAssistantResult(input)).toEqual({ valid: false, reason });
  });

  it("accepts an omitted recommended topic", () => {
    const { recommendedTopic: _omitted, ...withoutTopic } = validResult;
    expect(validateTutorAssistantResult(withoutTopic)).toEqual({ valid: true, value: withoutTopic });
  });

  it("rejects arrays and unrecognized metadata fields", () => {
    expect(validateTutorAssistantResult([])).toEqual({ valid: false, reason: "invalid_result" });
    expect(validateTutorAssistantResult({ ...validResult, authoritativeMastery: 4 })).toEqual({
      valid: false,
      reason: "invalid_result",
    });
  });
});
