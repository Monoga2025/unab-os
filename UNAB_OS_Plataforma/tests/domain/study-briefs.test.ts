import { describe, expect, it } from "vitest";
import { DIFFERENTIAL_EQUATIONS_BRIEF } from "@/lib/tema/study-briefs";

describe("differential equations study brief", () => {
  it("keeps the four source-grounded study actions and three private TEMA resources", () => {
    expect(DIFFERENTIAL_EQUATIONS_BRIEF.courseId).toBe("765");
    expect(DIFFERENTIAL_EQUATIONS_BRIEF.actions).toHaveLength(4);
    expect(DIFFERENTIAL_EQUATIONS_BRIEF.resources.map((resource) => resource.candidateId)).toEqual(["candidate-0241", "candidate-0242", "candidate-0243"]);
  });

  it("does not assert an unverified assessment date", () => {
    expect(JSON.stringify(DIFFERENTIAL_EQUATIONS_BRIEF)).not.toMatch(/\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i);
    expect(DIFFERENTIAL_EQUATIONS_BRIEF.summary).toContain("No afirma una fecha");
  });
});
