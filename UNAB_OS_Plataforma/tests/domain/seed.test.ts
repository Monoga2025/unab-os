import { describe, expect, it } from "vitest";
import { assertDynamicsSeed } from "@/lib/domain/seed";

const valid = { courseName: "Dynamics", unitCount: 1, objectiveCount: 4 };
describe("Dynamics seed invariant", () => {
  it.each([0, 1, 6])("rejects %i objectives", (objectiveCount) =>
    expect(() => assertDynamicsSeed({ ...valid, objectiveCount })).toThrow());
  it("accepts one Dynamics course, one unit, and 3–5 objectives", () =>
    expect(assertDynamicsSeed(valid)).toEqual(valid));
});
