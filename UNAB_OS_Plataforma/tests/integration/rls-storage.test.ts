import { describe, expect, it } from "vitest";
import { manuscriptPolicy } from "@/lib/domain/feedback";
describe("private manuscript constraints", () => {
  it("accepts only configured content constraints", () => {
    expect(manuscriptPolicy).toMatchObject({ maxBytes: 8_000_000, maxPages: 3, mimeTypes: ["application/pdf", "image/jpeg"] });
  });
});
