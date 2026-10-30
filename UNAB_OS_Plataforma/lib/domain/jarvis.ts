export const jarvisHandoffSchema = "unab-os.study-handoff.v1" as const;
export const jarvisReportSchema = "unab-os.study-report.v1" as const;
export const jarvisReportEnvelopeSchema = "unab-os.study-report-envelope.v1" as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SHORT = 180;
const MAX_TEXT = 2_000;
const MAX_PROMPT = 8_000;
const MAX_ITEMS = 8;
const MAX_DOCUMENT_BYTES = 10_000_000;

export type JarvisStudyHandoff = Readonly<{
  schemaVersion: typeof jarvisHandoffSchema;
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  topic: string;
  prompt: string;
  document: Readonly<{
    path: string;
    fileName: string;
    mimeType: string;
    bytes: number;
    sha256: string;
  }>;
  createdAt: string;
}>;

export type JarvisStudyReport = Readonly<{
  schemaVersion: typeof jarvisReportSchema;
  handoffId: string;
  summary: string;
  strengths: readonly Readonly<{ topic: string; evidence: string }>[];
  weaknesses: readonly Readonly<{ topic: string; evidence: string }>[];
  questionsMissed: readonly Readonly<{ question: string; reason: string }>[];
  confidence: "low" | "medium" | "high";
  nextActions: readonly Readonly<{ action: string; minutes: number }>[];
}>;

export type JarvisStudyReportEnvelope = Readonly<{
  schemaVersion: typeof jarvisReportEnvelopeSchema;
  ownerId: string;
  receivedAt: string;
  report: JarvisStudyReport;
}>;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function boundedString(value: unknown, maximum = MAX_SHORT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum && !value.includes("\0");
}

function isoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function topicEvidence(value: unknown): value is { topic: string; evidence: string } {
  const item = record(value);
  return Boolean(item && exactKeys(item, ["topic", "evidence"])
    && boundedString(item.topic) && boundedString(item.evidence, MAX_TEXT));
}

function missedQuestion(value: unknown): value is { question: string; reason: string } {
  const item = record(value);
  return Boolean(item && exactKeys(item, ["question", "reason"])
    && boundedString(item.question, MAX_TEXT) && boundedString(item.reason, MAX_TEXT));
}

function nextAction(value: unknown): value is { action: string; minutes: number } {
  const item = record(value);
  return Boolean(item && exactKeys(item, ["action", "minutes"])
    && boundedString(item.action, MAX_TEXT)
    && Number.isInteger(item.minutes) && Number(item.minutes) >= 5 && Number(item.minutes) <= 240);
}

function boundedArray<T>(value: unknown, validator: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length <= MAX_ITEMS && value.every(validator);
}

export function buildJarvisStudyPrompt(input: { handoffId: string; subject: string; topic: string }): string {
  if (!UUID_PATTERN.test(input.handoffId) || !boundedString(input.subject) || !boundedString(input.topic)) {
    throw new Error("Invalid Jarvis study prompt input.");
  }

  return [
    `Vas a actuar como tutor evaluador para ${input.subject}.`,
    `El foco de esta sesión es: ${input.topic}.`,
    "Usa únicamente el archivo adjunto y lo que yo responda. No inventes contenidos, fechas ni resultados.",
    "Primero hazme estudiar activamente: formula preguntas de una en una, pide mi razonamiento y corrige con explicación breve.",
    "No me des la solución completa antes de que yo intente responder. Distingue con claridad lo observado de cualquier inferencia.",
    "Al terminar, devuelve solamente un bloque JSON válido, sin Markdown ni texto adicional, con este esquema exacto:",
    JSON.stringify({
      schemaVersion: jarvisReportSchema,
      handoffId: input.handoffId,
      summary: "resumen breve y basado en evidencia",
      strengths: [{ topic: "punto fuerte", evidence: "respuesta concreta que lo demuestra" }],
      weaknesses: [{ topic: "punto débil", evidence: "error o duda concreta que lo demuestra" }],
      questionsMissed: [{ question: "pregunta fallada", reason: "qué falló y por qué" }],
      confidence: "low|medium|high",
      nextActions: [{ action: "acción de repaso verificable", minutes: 25 }],
    }, null, 2),
    "Usa como máximo 8 elementos por lista. minutes debe estar entre 5 y 240.",
    "Este informe es orientativo: no declares que actualiza calificaciones ni dominio académico oficial.",
  ].join("\n\n");
}

export function parseJarvisStudyHandoff(value: unknown): JarvisStudyHandoff | null {
  const handoff = record(value);
  if (!handoff || !exactKeys(handoff, ["schemaVersion", "id", "ownerId", "title", "subject", "topic", "prompt", "document", "createdAt"])) return null;
  const document = record(handoff.document);
  if (!document || !exactKeys(document, ["path", "fileName", "mimeType", "bytes", "sha256"])) return null;
  if (handoff.schemaVersion !== jarvisHandoffSchema || !UUID_PATTERN.test(String(handoff.id))
    || !UUID_PATTERN.test(String(handoff.ownerId)) || !boundedString(handoff.title)
    || !boundedString(handoff.subject) || !boundedString(handoff.topic)
    || !boundedString(handoff.prompt, MAX_PROMPT) || !isoDate(handoff.createdAt)
    || !boundedString(document.path, 4_096) || !boundedString(document.fileName)
    || !boundedString(document.mimeType) || !Number.isSafeInteger(document.bytes)
    || Number(document.bytes) < 1 || Number(document.bytes) > MAX_DOCUMENT_BYTES
    || typeof document.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(document.sha256)) return null;
  return handoff as unknown as JarvisStudyHandoff;
}

export function parseJarvisStudyReport(value: unknown): JarvisStudyReport | null {
  const report = record(value);
  if (!report || !exactKeys(report, ["schemaVersion", "handoffId", "summary", "strengths", "weaknesses", "questionsMissed", "confidence", "nextActions"])) return null;
  if (report.schemaVersion !== jarvisReportSchema || !UUID_PATTERN.test(String(report.handoffId))
    || !boundedString(report.summary, MAX_TEXT)
    || !boundedArray(report.strengths, topicEvidence)
    || !boundedArray(report.weaknesses, topicEvidence)
    || !boundedArray(report.questionsMissed, missedQuestion)
    || !boundedArray(report.nextActions, nextAction)
    || !["low", "medium", "high"].includes(String(report.confidence))) return null;
  return report as unknown as JarvisStudyReport;
}

export function parseJarvisStudyReportEnvelope(value: unknown): JarvisStudyReportEnvelope | null {
  const envelope = record(value);
  if (!envelope || !exactKeys(envelope, ["schemaVersion", "ownerId", "receivedAt", "report"])) return null;
  const report = parseJarvisStudyReport(envelope.report);
  if (envelope.schemaVersion !== jarvisReportEnvelopeSchema || !UUID_PATTERN.test(String(envelope.ownerId))
    || !isoDate(envelope.receivedAt) || !report) return null;
  return { schemaVersion: jarvisReportEnvelopeSchema, ownerId: String(envelope.ownerId), receivedAt: String(envelope.receivedAt), report };
}
