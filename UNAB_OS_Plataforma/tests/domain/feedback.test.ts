import { describe, expect, it } from "vitest";
import { analyzeManuscript } from "@/lib/domain/feedback";

describe("manuscript boundaries", () => {
  it.each(["image/png", "application/pdf"])("uses fallback for unsupported or unreadable %s", (mimeType) => {
    expect(analyzeManuscript({ mimeType, bytes: 9_000_001, pages: 2, readable: false }).status).toBe("fallback_required");
  });
});
