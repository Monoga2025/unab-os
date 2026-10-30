// Prompt assembly for the Entrenador bridge. The bridge takes a single prompt
// string, so the system prompt, the bounded conversation history, and the new
// user message are composed here into one payload.
import { ENTRENADOR_SYSTEM_PROMPT } from "./system-prompt";
import { MAX_HISTORY_TURNS } from "./limits";
import { MAX_AGY_PROMPT_CHARS } from "@/lib/ai/agy-bridge";

export { MAX_HISTORY_TURNS };

export type EntrenadorRole = "user" | "entrenador";

export type EntrenadorHistoryTurn = {
  role: EntrenadorRole;
  content: string;
};

export const ENTRENADOR_FORMAT_INSTRUCTION = [
  "INSTRUCCIÓN DE FORMATO OBLIGATORIA:",
  "Respondé en texto plano (prosa o markdown simple). No devuelvas JSON ni envuelvas toda la respuesta en un bloque de código.",
  "Escribí toda fórmula o símbolo matemático en notación LaTeX: usá $...$ para matemática en línea y $$...$$ para matemática en bloque o desplegada.",
].join("\n");

function roleLabel(role: EntrenadorRole): string {
  return role === "user" ? "USUARIO" : "ENTRENADOR";
}

/**
 * Composes the single bridge prompt: system prompt first, then the recent
 * transcript with explicit role labels, then the new user message.
 *
 * Two bounds are enforced:
 *   1. At most `MAX_HISTORY_TURNS` turns.
 *   2. A TOTAL character budget (`MAX_AGY_PROMPT_CHARS`), because the
 *      Antigravity bridge passes the prompt as ONE argv element and Windows
 *      caps a command line at ~32767 characters. The newest turns are kept and
 *      older ones are dropped first; the system prompt and the current message
 *      are never dropped.
 */
export function buildEntrenadorPrompt(
  history: readonly EntrenadorHistoryTurn[],
  userMessage: string,
): string {
  const head = [ENTRENADOR_SYSTEM_PROMPT, ENTRENADOR_FORMAT_INSTRUCTION];
  const tail = `USUARIO: ${userMessage}`;
  const boundedHistory = history.slice(-MAX_HISTORY_TURNS);

  // Fill from the newest turn backwards until the budget would be exceeded.
  const kept: string[] = [];
  for (let i = boundedHistory.length - 1; i >= 0; i--) {
    const line = `${roleLabel(boundedHistory[i].role)}: ${boundedHistory[i].content}`;
    const candidate = [...head, `HISTORIAL RECIENTE:\n${[line, ...kept].join("\n")}`, tail].join("\n\n");
    if (candidate.length > MAX_AGY_PROMPT_CHARS) break;
    kept.unshift(line);
  }

  const sections = [...head];
  if (kept.length) sections.push(`HISTORIAL RECIENTE:\n${kept.join("\n")}`);
  sections.push(tail);

  return sections.join("\n\n");
}
