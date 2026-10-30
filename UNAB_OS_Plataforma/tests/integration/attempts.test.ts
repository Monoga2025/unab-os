import { describe, expect, it } from "vitest";
import { parseAttemptSubmission } from "@/lib/attempt-submission";

describe("attempt submission boundary", () => {
  it("accepts only attempt fields and never accepts caller identity", () => {
    const formData = new FormData();
    formData.set("objectiveId", "fbd");
    formData.set("exerciseVersionId", "fbd-v1");
    formData.set("idempotencyKey", "retry-safe-key");
    formData.set("correct", "true");
    formData.set("helpLevel", "none");

    expect(parseAttemptSubmission(formData)).toEqual({ objectiveId: "fbd", exerciseVersionId: "fbd-v1", idempotencyKey: "retry-safe-key", correct: true, helpLevel: "none" });
    expect(parseAttemptSubmission(new FormData())).toBeNull();
  });
});
