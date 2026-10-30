import { describe, expect, it } from "vitest";
import {
  documentUploadPolicy,
  transitionStudySession,
  validateStudyDocument,
  validateStudySessionTargetMinutes,
  type StudySession,
} from "@/lib/domain/study";

describe("study document validation", () => {
  it("accepts supported personal study documents within the size limit", () => {
    expect(validateStudyDocument({
      kind: "rubric",
      fileName: "calculus-rubric.pdf",
      mimeType: "application/pdf",
      bytes: documentUploadPolicy.maxBytes,
    })).toEqual({ valid: true });
  });

  it.each([
    [{ kind: "material", fileName: "notes.exe", mimeType: "application/octet-stream", bytes: 100 }, "unsupported_mime_type"],
    [{ kind: "rubric", fileName: "rubric.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 100 }, "unsupported_mime_type"],
    [{ kind: "material", fileName: "../notes.pdf", mimeType: "application/pdf", bytes: 100 }, "invalid_file_name"],
    [{ kind: "material", fileName: "notes.pdf", mimeType: "application/pdf", bytes: documentUploadPolicy.maxBytes + 1 }, "file_too_large"],
    [{ kind: "material", fileName: "notes.pdf", mimeType: "application/pdf", bytes: 0 }, "invalid_file_size"],
  ] as const)("rejects invalid document metadata with %s", (input, reason) => {
    expect(validateStudyDocument(input)).toEqual({ valid: false, reason });
  });
});

describe("study session target duration", () => {
  it.each([5, 240])("accepts the inclusive boundary %s minutes", (targetMinutes) => {
    expect(validateStudySessionTargetMinutes(targetMinutes)).toBe(true);
  });

  it("accepts an omitted duration target", () => {
    expect(validateStudySessionTargetMinutes(null)).toBe(true);
  });

  it.each([4, 241, 5.5, Number.NaN])("rejects the invalid duration %s minutes", (targetMinutes) => {
    expect(validateStudySessionTargetMinutes(targetMinutes)).toBe(false);
  });
});

describe("study session lifecycle", () => {
  const planned: StudySession = {
    status: "planned",
    plannedFor: "2026-08-17T10:00:00.000Z",
    targetMinutes: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  it("records lifecycle timestamps when a planned session starts and completes", () => {
    const active = transitionStudySession(planned, "active", "2026-08-17T10:05:00.000Z");
    expect(active).toEqual({ ...planned, status: "active", startedAt: "2026-08-17T10:05:00.000Z" });

    expect(transitionStudySession(active, "completed", "2026-08-17T11:00:00.000Z")).toEqual({
      ...active,
      status: "completed",
      completedAt: "2026-08-17T11:00:00.000Z",
    });
  });

  it("allows cancellation but prevents transitions out of terminal states", () => {
    const cancelled = transitionStudySession(planned, "cancelled", "2026-08-17T09:00:00.000Z");
    expect(cancelled.cancelledAt).toBe("2026-08-17T09:00:00.000Z");
    expect(() => transitionStudySession(cancelled, "active", "2026-08-17T10:00:00.000Z"))
      .toThrow("Invalid study session transition: cancelled -> active");
  });

  it("rejects completion before a session is active", () => {
    expect(() => transitionStudySession(planned, "completed", "2026-08-17T11:00:00.000Z"))
      .toThrow("Invalid study session transition: planned -> completed");
  });

  it("rejects an invalid lifecycle timestamp", () => {
    expect(() => transitionStudySession(planned, "active", "not-a-timestamp"))
      .toThrow("Invalid study session transition timestamp");
  });

  it("rejects completion before the recorded start", () => {
    const active = transitionStudySession(planned, "active", "2026-08-17T10:05:00.000Z");
    expect(() => transitionStudySession(active, "completed", "2026-08-17T10:00:00.000Z"))
      .toThrow("Study session completion cannot precede its start");
  });

  it("rejects cancellation before the recorded start", () => {
    const active = transitionStudySession(planned, "active", "2026-08-17T10:05:00.000Z");
    expect(() => transitionStudySession(active, "cancelled", "2026-08-17T10:00:00.000Z"))
      .toThrow("Study session cancellation cannot precede its start");
  });
});
