import { describe, expect, it } from "vitest";
import { safeTutorResponse } from "@/lib/ai/codex-app-server";
import { analyzeManuscript } from "@/lib/domain/feedback";
describe("seeded learner loop", () => {
  it("navigates seeded content, withholds solutions, and offers upload fallback", async () => {
    expect((await safeTutorResponse({ request: "complete solution", hasIndependentAttempt: false })).kind).toBe("retrieval_fallback");
    expect(analyzeManuscript({ mimeType: "image/png", bytes: 2, pages: 1, readable: false }).status).toBe("fallback_required");
  });
});
