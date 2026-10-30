export type ManuscriptPolicy = { mimeTypes: string[]; maxBytes: number; maxPages: number };
export type ManuscriptAnalysis = { status: "analyzed" | "fallback_required"; confidence: "high" | "medium" | "low" | "unsupported"; fallback: "typed" | "annotated"; limitation?: string };
export const manuscriptPolicy: ManuscriptPolicy = { mimeTypes: ["application/pdf", "image/jpeg"], maxBytes: 8_000_000, maxPages: 3 };

export function analyzeManuscript(input: { mimeType: string; bytes: number; pages: number; readable: boolean; confidence?: "high" | "medium" | "low" }): ManuscriptAnalysis {
  if (!manuscriptPolicy.mimeTypes.includes(input.mimeType) || input.bytes > manuscriptPolicy.maxBytes || input.pages > manuscriptPolicy.maxPages || !input.readable || input.confidence === "low") {
    return { status: "fallback_required", confidence: !manuscriptPolicy.mimeTypes.includes(input.mimeType) ? "unsupported" : "low", fallback: "typed", limitation: "This manuscript cannot be reliably interpreted. Submit typed work or an annotated image." };
  }
  return { status: "analyzed", confidence: input.confidence ?? "medium", fallback: "annotated" };
}
