export type StudyDocumentKind = "material" | "rubric";
export type StudyDocumentStatus = "pending" | "ready" | "failed";

export type StudyDocumentMetadata = {
  kind: StudyDocumentKind;
  fileName: string;
  mimeType: string;
  bytes: number;
};

export const documentUploadPolicy = {
  maxBytes: 10_000_000,
  mimeTypes: [
    "application/pdf",
    "text/plain",
  ],
} as const;

export type DocumentValidationResult =
  | { valid: true }
  | { valid: false; reason: "invalid_file_name" | "invalid_file_size" | "file_too_large" | "unsupported_mime_type" };

export function validateStudyDocument(input: StudyDocumentMetadata): DocumentValidationResult {
  const fileName = input.fileName.trim();
  if (!fileName || fileName !== input.fileName || fileName.length > 255 || /[\\/\u0000-\u001f]/.test(fileName) || fileName === "." || fileName === "..") {
    return { valid: false, reason: "invalid_file_name" };
  }
  if (!Number.isSafeInteger(input.bytes) || input.bytes <= 0) {
    return { valid: false, reason: "invalid_file_size" };
  }
  if (input.bytes > documentUploadPolicy.maxBytes) {
    return { valid: false, reason: "file_too_large" };
  }
  if (!documentUploadPolicy.mimeTypes.includes(input.mimeType as (typeof documentUploadPolicy.mimeTypes)[number])) {
    return { valid: false, reason: "unsupported_mime_type" };
  }
  return { valid: true };
}

export const studySessionTargetPolicy = {
  minMinutes: 5,
  maxMinutes: 240,
} as const;

export function validateStudySessionTargetMinutes(targetMinutes: number | null): boolean {
  return targetMinutes === null
    || (Number.isInteger(targetMinutes)
      && targetMinutes >= studySessionTargetPolicy.minMinutes
      && targetMinutes <= studySessionTargetPolicy.maxMinutes);
}

export type StudySessionStatus = "planned" | "active" | "completed" | "cancelled";
export type StudySession = {
  status: StudySessionStatus;
  plannedFor: string;
  targetMinutes: number | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

const allowedTransitions: Record<StudySessionStatus, readonly StudySessionStatus[]> = {
  planned: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function transitionStudySession(session: StudySession, nextStatus: StudySessionStatus, at: string): StudySession {
  if (!allowedTransitions[session.status].includes(nextStatus)) {
    throw new Error(`Invalid study session transition: ${session.status} -> ${nextStatus}`);
  }
  const transitionTime = Date.parse(at);
  if (Number.isNaN(transitionTime)) {
    throw new Error("Invalid study session transition timestamp");
  }
  if (session.startedAt !== null && transitionTime < Date.parse(session.startedAt)) {
    if (nextStatus === "completed") {
      throw new Error("Study session completion cannot precede its start");
    }
    if (nextStatus === "cancelled") {
      throw new Error("Study session cancellation cannot precede its start");
    }
  }

  if (nextStatus === "active") return { ...session, status: nextStatus, startedAt: at };
  if (nextStatus === "completed") return { ...session, status: nextStatus, completedAt: at };
  return { ...session, status: nextStatus, cancelledAt: at };
}
