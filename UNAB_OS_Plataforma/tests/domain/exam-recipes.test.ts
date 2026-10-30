import { describe, expect, it } from "vitest";
import { EXAM_RECIPES } from "@/components/uninova/uninova-bernoulli-card";

describe("Engineering Exam Cheat-Sheet Recipes Domain", () => {
  it("includes all 3 core engineering exam recipes", () => {
    const ids = EXAM_RECIPES.map((r) => r.id);
    expect(ids).toContain("bernoulli");
    expect(ids).toContain("grashof");
    expect(ids).toContain("fasores");
  });

  it("defines complete step-by-step algorithms for each recipe", () => {
    for (const recipe of EXAM_RECIPES) {
      expect(recipe.steps.length).toBeGreaterThanOrEqual(4);
      for (const s of recipe.steps) {
        expect(s.formula).toBeTruthy();
        expect(s.explanation).toBeTruthy();
        expect(s.proTip).toBeTruthy();
      }
    }
  });

  it("contains valid Grashof inequality condition in mechanisms recipe", () => {
    const grashof = EXAM_RECIPES.find((r) => r.id === "grashof");
    expect(grashof).toBeDefined();
    const formulaText = grashof!.steps.map((s) => s.formula).join(" ");
    expect(formulaText).toContain("S + L  ≤  P + Q");
  });

  it("contains valid phasor domain impedance equations in circuits recipe", () => {
    const fasores = EXAM_RECIPES.find((r) => r.id === "fasores");
    expect(fasores).toBeDefined();
    const formulaText = fasores!.steps.map((s) => s.formula).join(" ");
    expect(formulaText).toContain("ZL = j·ω·L");
    expect(formulaText).toContain("ZC = 1 / (j·ω·C)");
  });
});
