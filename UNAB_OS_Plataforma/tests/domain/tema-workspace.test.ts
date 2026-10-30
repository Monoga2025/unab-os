import { describe, expect, it } from "vitest";
import type { TemaActivity, TemaCourse, TemaData, TemaFile } from "@/lib/tema/data";
import { courseState, normalizeStudyQuery, prioritizedDeadlines, resolveStudyMaterial } from "@/lib/tema/workspace";

const now = Date.parse("2026-08-24T15:00:00.000Z");

function course(overrides: Partial<TemaCourse> = {}): TemaCourse {
  return { id: "course-1", name: "Ecuaciones Diferenciales", accessFailed: false, startsAt: null, endsAt: null, lastAccessAt: null, activeState: "unknown", ...overrides };
}

function activity(overrides: Partial<TemaActivity> = {}): TemaActivity {
  return { id: "activity-1", courseId: "course-1", sectionId: "section-1", name: "Problemas de valor inicial", moduleType: "assign", availabilityText: [], candidateNames: [], opensAt: null, dueAt: null, completionState: "pending", ...overrides };
}

function file(candidateId: string, fileName: string, activityName = "Problemas de valor inicial", overrides: Partial<TemaFile> = {}): TemaFile {
  return { candidateId, courseId: "course-1", sectionId: "section-1", activityName, fileName, fileType: "pdf", contentType: "application/pdf", bytes: 500_000, sha256: "a".repeat(64), status: "downloaded", localRelativePath: `files/${fileName}`, extractedText: null, textExtractionStatus: "not_extracted", ...overrides };
}

function data(courses: readonly TemaCourse[], activities: readonly TemaActivity[], files: readonly TemaFile[] = []): TemaData {
  return { courses, sections: [], activities, files };
}

describe("TEMA academic workspace", () => {
  it("infers an active course from a current period, recent access or a relevant deadline", () => {
    expect(courseState(course({ endsAt: "2026-12-01T05:00:00Z" }), [], now)).toBe("active");
    expect(courseState(course({ lastAccessAt: "2026-08-20T15:00:00Z" }), [], now)).toBe("active");
    expect(courseState(course(), [activity({ dueAt: "2026-08-28T15:00:00Z" })], now)).toBe("active");
    expect(courseState(course({ endsAt: "2026-06-01T05:00:00Z" }), [], now)).toBe("historical");
  });

  it("prioritizes only verifiable open work from active courses", () => {
    const active = course({ activeState: "active" });
    const result = prioritizedDeadlines(data([active], [
      activity({ id: "later", dueAt: "2026-08-27T15:00:00Z" }),
      activity({ id: "overdue", dueAt: "2026-08-23T15:00:00Z" }),
      activity({ id: "done", dueAt: "2026-08-25T15:00:00Z", completionState: "submitted" }),
    ]), now);
    expect(result.map((item) => [item.activity.id, item.status])).toEqual([["overdue", "overdue"], ["later", "upcoming"]]);
  });

  it("never promotes an old or unverified overdue activity as today's action", () => {
    const active = course({ activeState: "active" });
    const result = prioritizedDeadlines(data([active], [
      activity({ id: "old", dueAt: "2026-08-18T17:15:00Z", completionState: "pending" }),
      activity({ id: "unknown", dueAt: "2026-08-23T15:00:00Z", completionState: "unknown" }),
      activity({ id: "tomorrow", dueAt: "2026-08-25T15:00:00Z", completionState: "unknown" }),
    ]), now);
    expect(result.map((item) => item.activity.id)).toEqual(["tomorrow"]);
  });

  it("normalizes natural Spanish requests and resolves none, single or multiple deterministically", () => {
    expect(normalizeStudyQuery("Necesito estudiar para Ecuaciones, por favor")).toBe("ecuaciones");
    const catalog = data([course()], [], [
      file("pvi", "PVI.pdf"),
      file("laplace", "Transformada de Laplace.pdf", "Transformada de Laplace"),
      file("oversize", "Gigante.pdf", "Ecuaciones", { bytes: 12_000_000 }),
    ]);
    expect(resolveStudyMaterial(catalog, "química").kind).toBe("none");
    expect(resolveStudyMaterial(catalog, "laplace")).toMatchObject({ kind: "single", matches: [{ candidateId: "laplace" }] });
    const broad = resolveStudyMaterial(catalog, "necesito estudiar ecuaciones");
    expect(broad.kind).toBe("multiple");
    expect(broad.matches.map((match) => match.candidateId)).toEqual(["pvi", "laplace"]);
  });
});
