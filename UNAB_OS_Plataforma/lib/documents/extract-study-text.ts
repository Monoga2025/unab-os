import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { validateStudyDocumentBytes } from "@/lib/domain/study-document-bytes";

const executeFile = promisify(execFile);
export const maxStudyContextCharacters = 24_000;
const PDF_TIMEOUT_MS = 8_000;
const PDF_MAX_BUFFER_BYTES = 512 * 1024;

type PdfRunnerInput = {
  command: "pdftotext";
  args: [string, "-"];
  cwd: string;
  timeout: number;
  maxBuffer: number;
};

type ExtractStudyTextInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  runPdf?: (input: PdfRunnerInput) => Promise<{ stdout: string }>;
};

function boundText(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  return normalized.slice(0, maxStudyContextCharacters);
}

async function defaultPdfRunner(input: PdfRunnerInput) {
  return executeFile(input.command, input.args, {
    cwd: input.cwd,
    timeout: input.timeout,
    maxBuffer: input.maxBuffer,
    encoding: "utf8",
    windowsHide: true,
  });
}

export async function extractStudyText(input: ExtractStudyTextInput): Promise<string> {
  const validation = validateStudyDocumentBytes({
    fileName: input.fileName,
    claimedMimeType: input.mimeType,
    bytes: input.bytes,
  });
  if (!validation.valid || validation.mimeType !== input.mimeType) {
    throw new Error("Study document bytes do not match the stored document metadata.");
  }

  if (validation.mimeType === "text/plain") {
    return boundText(new TextDecoder("utf-8", { fatal: true }).decode(input.bytes));
  }

  const directory = await mkdtemp(join(tmpdir(), "unab-tutor-pdf-"));
  const inputPath = join(directory, "source.pdf");
  try {
    await writeFile(inputPath, input.bytes, { flag: "wx" });
    const result = await (input.runPdf ?? defaultPdfRunner)({
      command: "pdftotext",
      args: [inputPath, "-"],
      cwd: directory,
      timeout: PDF_TIMEOUT_MS,
      maxBuffer: PDF_MAX_BUFFER_BYTES,
    });
    return boundText(result.stdout);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
