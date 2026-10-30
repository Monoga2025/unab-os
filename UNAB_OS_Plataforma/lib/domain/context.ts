export const MAX_CONTEXT_HISTORY_ITEMS = 5;
export type Resource = { id: string; source: "teacher" | "external"; coversObjective: boolean };
export type ContextSnapshot = { courseId: string; unitId: string; topicId: string; objectiveId: string; teacherResourceIds: string[]; externalResourceIds: string[]; historyIds: string[] };

export function selectContext(hierarchy: Pick<ContextSnapshot, "courseId" | "unitId" | "topicId" | "objectiveId">, resources: Resource[], newestHistory: string[]): ContextSnapshot {
  const teacherResourceIds = resources.filter((resource) => resource.source === "teacher" && resource.coversObjective).map((resource) => resource.id);
  // External content fills only a documented teacher-content gap.
  const externalResourceIds = teacherResourceIds.length ? [] : resources.filter((resource) => resource.source === "external" && resource.coversObjective).map((resource) => resource.id);
  return { ...hierarchy, teacherResourceIds, externalResourceIds, historyIds: newestHistory.slice(0, MAX_CONTEXT_HISTORY_ITEMS) };
}
