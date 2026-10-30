import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractStudyText, maxStudyContextCharacters } from "@/lib/documents/extract-study-text";

const pdfBytes = new TextEncoder().encode("%PDF-1.7\nplaceholder");

describe("extractStudyText", () => {
  it("strictly decodes and bounds TXT context", async () => {
    const text = "a".repeat(maxStudyContextCharacters + 100);
    await expect(extractStudyText({ fileName: "notes.txt", mimeType: "text/plain", bytes: new TextEncoder().encode(text) }))
      .resolves.toHaveLength(maxStudyContextCharacters);
  });

  it("runs pdftotext with argument arrays in an isolated directory and cleans it", async () => {
    let isolatedDirectory = "";
    const result = await extractStudyText({
      fileName: "notes.pdf",
      mimeType: "application/pdf",
      bytes: pdfBytes,
      runPdf: async (invocation) => {
        isolatedDirectory = invocation.cwd;
        expect(invocation.command).toBe("pdftotext");
        expect(invocation.args).toEqual([expect.stringMatching(/source\.pdf$/), "-"]);
        expect(invocation.args).toHaveLength(2);
        expect(invocation.timeout).toBeGreaterThan(0);
        expect(invocation.maxBuffer).toBeGreaterThan(0);
        return { stdout: "  bounded PDF text  " };
      },
    });

    expect(result).toBe("bounded PDF text");
    await expect(access(isolatedDirectory)).rejects.toThrow();
  });

  it("rejects stored metadata that does not match validated bytes", async () => {
    await expect(extractStudyText({ fileName: "notes.pdf", mimeType: "text/plain", bytes: pdfBytes }))
      .rejects.toThrow(/metadata/);
  });
});
