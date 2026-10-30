import { describe, expect, it } from "vitest";
import {
  buildJarvisStudyPrompt,
  jarvisReportEnvelopeSchema,
  jarvisReportSchema,
  parseJarvisStudyReport,
  parseJarvisStudyReportEnvelope,
} from "@/lib/domain/jarvis";

const handoffId = "123e4567-e89b-42d3-a456-426614174000";
const ownerId = "123e4567-e89b-42d3-a456-426614174001";

const validReport = {
  schemaVersion: jarvisReportSchema,
  handoffId,
  summary: "Reconoce el modelo, pero confunde frecuencia y frecuencia angular.",
  strengths: [{ topic: "Modelo masa-resorte", evidence: "Identificó correctamente k y m." }],
  weaknesses: [{ topic: "Frecuencia angular", evidence: "Usó f donde correspondía omega." }],
  questionsMissed: [{ question: "Calcular omega", reason: "Confundió las unidades." }],
  confidence: "high",
  nextActions: [{ action: "Resolver tres ejercicios sin ayuda", minutes: 25 }],
} as const;

describe("Jarvis study handoff contract", () => {
  it("builds an evidence-bound prompt with a machine-readable final report", () => {
    const prompt = buildJarvisStudyPrompt({ handoffId, subject: "Ondas", topic: "Oscilaciones" });
    expect(prompt).toContain(handoffId);
    expect(prompt).toContain(jarvisReportSchema);
    expect(prompt).toContain("únicamente el archivo adjunto");
    expect(prompt).toContain("no declares que actualiza calificaciones");
  });

  it("accepts the bounded exact report schema", () => {
    expect(parseJarvisStudyReport(validReport)).toEqual(validReport);
    expect(parseJarvisStudyReportEnvelope({
      schemaVersion: jarvisReportEnvelopeSchema,
      ownerId,
      receivedAt: "2026-08-23T15:00:00.000Z",
      report: validReport,
    })?.ownerId).toBe(ownerId);
  });

  it("rejects extra keys, invalid durations, and malformed ownership envelopes", () => {
    expect(parseJarvisStudyReport({ ...validReport, officialMastery: 4 })).toBeNull();
    expect(parseJarvisStudyReport({ ...validReport, nextActions: [{ action: "Repasar", minutes: 0 }] })).toBeNull();
    expect(parseJarvisStudyReportEnvelope({
      schemaVersion: jarvisReportEnvelopeSchema,
      ownerId: "telegram-user",
      receivedAt: "not-a-date",
      report: validReport,
    })).toBeNull();
  });
});
