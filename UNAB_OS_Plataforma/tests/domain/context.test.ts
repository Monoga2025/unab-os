import { describe, expect, it } from "vitest";
import { selectContext } from "@/lib/domain/context";

it("orders teacher resources first and caps relevant history at five", () => {
  const snapshot = selectContext({ courseId: "c", unitId: "u", topicId: "t", objectiveId: "o" },
    [{ id: "teacher", source: "teacher", coversObjective: true }, { id: "external", source: "external", coversObjective: true }],
    ["h6", "h5", "h4", "h3", "h2", "h1"]);
  expect(snapshot.teacherResourceIds).toEqual(["teacher"]);
  expect(snapshot.externalResourceIds).toEqual([]);
  expect(snapshot.historyIds).toEqual(["h6", "h5", "h4", "h3", "h2"]);
});
