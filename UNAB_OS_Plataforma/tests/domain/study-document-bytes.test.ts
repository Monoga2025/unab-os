import { describe, expect, it } from "vitest";
import { documentUploadPolicy } from "@/lib/domain/study";
import { validateStudyDocumentBytes } from "@/lib/domain/study-document-bytes";

const encoder = new TextEncoder();

describe("study document byte validation", () => {
  it("accepts a signed PDF and derives its canonical MIME instead of trusting the browser claim", () => {
    expect(validateStudyDocumentBytes({
      fileName: "rubric.pdf",
      claimedMimeType: "text/plain",
      bytes: encoder.encode("%PDF-1.7\n1 0 obj\n"),
    })).toEqual({ valid: true, mimeType: "application/pdf", extension: "pdf" });
  });

  it("accepts valid UTF-8 text and derives its canonical MIME", () => {
    expect(validateStudyDocumentBytes({
      fileName: "notes.txt",
      claimedMimeType: "application/octet-stream",
      bytes: encoder.encode("Aceleración angular: α = Δω/Δt\n"),
    })).toEqual({ valid: true, mimeType: "text/plain", extension: "txt" });
  });

  it.each([
    ["renamed.txt", encoder.encode("%PDF-1.7\n"), "content_extension_mismatch"],
    ["renamed.pdf", encoder.encode("ordinary text"), "invalid_pdf_signature"],
    ["archive.docx", Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), "unsupported_extension"],
    ["binary.txt", Uint8Array.from([0x00, 0x01, 0x02]), "binary_text"],
    ["invalid.txt", Uint8Array.from([0xc3, 0x28]), "invalid_utf8"],
  ] as const)("rejects spoofed or unsafe content in %s", (fileName, bytes, reason) => {
    expect(validateStudyDocumentBytes({ fileName, claimedMimeType: "application/pdf", bytes }))
      .toEqual({ valid: false, reason });
  });

  it("accepts a file exactly at the byte limit", () => {
    const bytes = new Uint8Array(documentUploadPolicy.maxBytes).fill(0x61);
    expect(validateStudyDocumentBytes({ fileName: "limit.txt", claimedMimeType: "text/plain", bytes }))
      .toEqual({ valid: true, mimeType: "text/plain", extension: "txt" });
  });

  it("rejects a file over the byte limit", () => {
    const bytes = new Uint8Array(documentUploadPolicy.maxBytes + 1).fill(0x61);
    expect(validateStudyDocumentBytes({ fileName: "large.txt", claimedMimeType: "text/plain", bytes }))
      .toEqual({ valid: false, reason: "file_too_large" });
  });
});
