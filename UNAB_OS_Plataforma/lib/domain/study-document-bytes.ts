import { documentUploadPolicy } from "@/lib/domain/study";

export type StudyDocumentByteValidationResult =
  | { valid: true; mimeType: "application/pdf" | "text/plain"; extension: "pdf" | "txt" }
  | {
    valid: false;
    reason:
      | "invalid_file_size"
      | "file_too_large"
      | "unsupported_extension"
      | "invalid_pdf_signature"
      | "content_extension_mismatch"
      | "invalid_utf8"
      | "binary_text";
  };

type StudyDocumentBytes = {
  fileName: string;
  claimedMimeType?: string;
  bytes: Uint8Array;
};

const PDF_SIGNATURE = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

function hasPdfSignature(bytes: Uint8Array) {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function validateStudyDocumentBytes(input: StudyDocumentBytes): StudyDocumentByteValidationResult {
  if (input.bytes.byteLength === 0) return { valid: false, reason: "invalid_file_size" };
  if (input.bytes.byteLength > documentUploadPolicy.maxBytes) return { valid: false, reason: "file_too_large" };

  const extension = input.fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  if (extension !== "pdf" && extension !== "txt") return { valid: false, reason: "unsupported_extension" };

  const pdf = hasPdfSignature(input.bytes);
  if (extension === "pdf") {
    return pdf
      ? { valid: true, mimeType: "application/pdf", extension: "pdf" }
      : { valid: false, reason: "invalid_pdf_signature" };
  }
  if (pdf) return { valid: false, reason: "content_extension_mismatch" };

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(input.bytes);
  } catch {
    return { valid: false, reason: "invalid_utf8" };
  }
  if (/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    return { valid: false, reason: "binary_text" };
  }

  return { valid: true, mimeType: "text/plain", extension: "txt" };
}
