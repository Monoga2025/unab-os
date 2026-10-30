import { describe, expect, it } from "vitest";
import { calculateDashboard, deriveMastery } from "@/lib/domain/learning";

describe("independent evidence", () => {
  it("excludes helped and missing evidence and calculates 3/4 North Star", () => {
    const dashboard = calculateDashboard([
      { objectiveId: "a", correct: true, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" },
      { objectiveId: "b", correct: true, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" },
      { objectiveId: "c", correct: true, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" },
      { objectiveId: "d", correct: false, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" },
      { objectiveId: "helped", correct: true, helpLevel: "hint", version: "v1", at: "2026-01-01T00:00:00Z" },
    ], ["a", "b", "c", "d", "helped", "missing"]);
    expect(dashboard.northStar).toEqual({ numerator: 3, denominator: 4, value: 0.75 });
    expect(dashboard.missingIndependentEvidence).toEqual(["helped", "missing"]);
  });
  it("caps M4 until two correct distinct-version slots occur on distinct UTC dates", () => {
    expect(deriveMastery([{ objectiveId: "a", correct: true, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" }], true).level).toBe(3);
    expect(deriveMastery([
      { objectiveId: "a", correct: true, helpLevel: "none", version: "v1", at: "2026-01-01T00:00:00Z" },
      { objectiveId: "a", correct: true, helpLevel: "none", version: "v2", at: "2026-01-02T00:00:00Z" },
    ], true).level).toBe(4);
  });
});
