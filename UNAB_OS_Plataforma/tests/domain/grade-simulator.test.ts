import { describe, expect, it } from "vitest";
import {
  calculateNeededGrade,
  calculateSemesterPga,
  INITIAL_SUBJECTS,
  type SubjectGrades,
} from "@/components/uninova/uninova-grade-simulator";

describe("UNAB Grade Simulator Domain Logic", () => {
  it("calculates exact needed grade for 30-30-40 rule when student has 3.2 and 2.8", () => {
    // Corte 1 (30%): 3.2 * 0.3 = 0.96
    // Corte 2 (30%): 2.8 * 0.3 = 0.84
    // Accumulated: 1.80
    // Target 3.0: (3.0 - 1.80) / 0.4 = 1.20 / 0.4 = 3.00
    const needed = calculateNeededGrade(3.0, 3.2, 2.8);
    expect(needed).toBe(3.0);
  });

  it("identifies when a subject is already passed (needed grade <= 0)", () => {
    // Corte 1: 5.0 (1.5) + Corte 2: 5.0 (1.5) = 3.0 pts accumulated
    const needed = calculateNeededGrade(3.0, 5.0, 5.0);
    expect(needed).toBeLessThanOrEqual(0);
  });

  it("identifies when passing is mathematically impossible (> 5.0)", () => {
    // Corte 1: 1.0 (0.3) + Corte 2: 1.0 (0.3) = 0.6 pts accumulated
    // Target 3.0: (3.0 - 0.6) / 0.4 = 2.4 / 0.4 = 6.0 > 5.0
    const needed = calculateNeededGrade(3.0, 1.0, 1.0);
    expect(needed).toBe(6.0);
    expect(needed).toBeGreaterThan(5.0);
  });

  it("calculates credit-weighted semester PGA accurately", () => {
    const mockSubjects: SubjectGrades[] = [
      { id: "s1", name: "Materia A", code: "MAT-1", credits: 4, corte1: 4.0, corte2: 4.0 }, // 4.0*0.6 + 3.5*0.4 = 3.8 * 4 = 15.2
      { id: "s2", name: "Materia B", code: "MAT-2", credits: 2, corte1: 3.0, corte2: 3.0 }, // 3.0*0.6 + 3.5*0.4 = 3.2 * 2 = 6.4
    ];
    // Total credits = 6
    // Total weighted = 15.2 + 6.4 = 21.6
    // PGA = 21.6 / 6 = 3.6
    const pga = calculateSemesterPga(mockSubjects, 3.5);
    expect(pga).toBe(3.6);
  });

  it("has valid default UNAB engineering subject catalogue", () => {
    expect(INITIAL_SUBJECTS.length).toBeGreaterThanOrEqual(6);
    for (const sub of INITIAL_SUBJECTS) {
      expect(sub.credits).toBeGreaterThan(0);
      expect(sub.corte1).toBeGreaterThanOrEqual(0);
      expect(sub.corte1).toBeLessThanOrEqual(5.0);
      expect(sub.corte2).toBeGreaterThanOrEqual(0);
      expect(sub.corte2).toBeLessThanOrEqual(5.0);
    }
  });
});
