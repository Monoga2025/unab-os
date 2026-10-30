export type SeedShape = { courseName: string; unitCount: number; objectiveCount: number };

/** Refuse activation instead of quietly selecting arbitrary course content. */
export function assertDynamicsSeed(shape: SeedShape): SeedShape {
  if (shape.courseName !== "Dynamics" || shape.unitCount !== 1 || shape.objectiveCount < 3 || shape.objectiveCount > 5) {
    throw new Error("Seed must contain exactly one Dynamics course, one unit, and 3–5 objectives.");
  }
  return shape;
}
