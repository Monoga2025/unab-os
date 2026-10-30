import { describe, expect, it } from "vitest";
import {
  buildEntrenadorPrompt,
  ENTRENADOR_FORMAT_INSTRUCTION,
  MAX_HISTORY_TURNS,
  type EntrenadorHistoryTurn,
} from "@/lib/entrenador/prompt";
import { ENTRENADOR_SYSTEM_PROMPT } from "@/lib/entrenador/system-prompt";

describe("entrenador prompt builder", () => {
  it("starts with the verbatim Spanish system prompt", () => {
    const prompt = buildEntrenadorPrompt([], "Explícame Bernoulli");
    expect(prompt.startsWith(ENTRENADOR_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("Entrenador de Supervivencia");
  });

  it("embeds the plain-prose and LaTeX format instruction", () => {
    const prompt = buildEntrenadorPrompt([], "hola");
    expect(prompt).toContain(ENTRENADOR_FORMAT_INSTRUCTION);
    expect(ENTRENADOR_FORMAT_INSTRUCTION).toContain("$...$");
    expect(ENTRENADOR_FORMAT_INSTRUCTION).toContain("$$...$$");
    expect(ENTRENADOR_FORMAT_INSTRUCTION).toMatch(/No devuelvas JSON/);
  });

  it("labels history roles and ends with the new user message", () => {
    const history: EntrenadorHistoryTurn[] = [
      { role: "user", content: "tengo dudas" },
      { role: "entrenador", content: "mostrame el intento" },
    ];
    const prompt = buildEntrenadorPrompt(history, "este es mi intento");

    expect(prompt).toContain("USUARIO: tengo dudas");
    expect(prompt).toContain("ENTRENADOR: mostrame el intento");
    expect(prompt.trimEnd().endsWith("USUARIO: este es mi intento")).toBe(true);
  });

  it("bounds the history to the most recent turns", () => {
    const history: EntrenadorHistoryTurn[] = Array.from({ length: 30 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "entrenador",
      content: `turno-${index}`,
    }));
    const prompt = buildEntrenadorPrompt(history, "nuevo");

    const includedTurns = history.slice(-MAX_HISTORY_TURNS);
    expect(prompt).not.toContain("turno-0");
    expect(prompt).toContain(`turno-${includedTurns[0].content.split("-")[1]}`);
    expect(prompt).toContain("turno-29");
    expect(prompt).toContain("USUARIO: nuevo");
  });

  it("does not add a history section when there is no history", () => {
    const prompt = buildEntrenadorPrompt([], "primera pregunta");
    expect(prompt).not.toContain("HISTORIAL RECIENTE");
    expect(prompt).toContain("USUARIO: primera pregunta");
  });
});
