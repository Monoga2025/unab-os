import { describe, expect, it } from "vitest";
import { AgyBridgeError, MAX_AGY_PROMPT_CHARS, buildAgyArgs, runAgy } from "@/lib/ai/agy-bridge";

/**
 * The argv shape below is VERIFIED against agy 1.2.12 on this machine:
 *   agy -p "<prompt>" --output-format text --sandbox
 * exits 0 and prints the plain-text answer on stdout.
 */
describe("agy bridge argv", () => {
  it("uses print mode with plain text output and the sandbox", () => {
    const args = buildAgyArgs("hola");
    expect(args).toEqual(["-p", "hola", "--output-format", "text", "--sandbox"]);
  });

  it("never auto-approves tool permissions", () => {
    const args = buildAgyArgs("hola");
    expect(args).not.toContain("--dangerously-skip-permissions");
  });

  it("appends a model only when one is given", () => {
    expect(buildAgyArgs("hola")).not.toContain("--model");
    const withModel = buildAgyArgs("hola", "gemini-3.8-flash-high");
    expect(withModel).toContain("--model");
    expect(withModel[withModel.indexOf("--model") + 1]).toBe("gemini-3.8-flash-high");
  });

  it("keeps the prompt as a single argv element so no shell string is ever built", () => {
    const args = buildAgyArgs("línea 1\nlínea 2 ; && rm -rf /");
    expect(args[0]).toBe("-p");
    expect(args[1]).toBe("línea 1\nlínea 2 ; && rm -rf /");
  });
});

describe("agy bridge result handling", () => {
  it("returns the trimmed plain text", async () => {
    await expect(runAgy({ prompt: "x", invoke: async () => "  respuesta\n" })).resolves.toBe("respuesta");
  });

  it("throws instead of fabricating when agy prints nothing", async () => {
    await expect(runAgy({ prompt: "x", invoke: async () => "   " })).rejects.toBeInstanceOf(AgyBridgeError);
  });

  it("refuses an empty prompt", async () => {
    await expect(runAgy({ prompt: "   ", invoke: async () => "nunca" })).rejects.toBeInstanceOf(AgyBridgeError);
  });

  it("refuses a prompt beyond the Windows command-line budget instead of spawning a doomed process", async () => {
    const huge = "a".repeat(MAX_AGY_PROMPT_CHARS + 1);
    await expect(runAgy({ prompt: huge, invoke: async () => "nunca" })).rejects.toBeInstanceOf(AgyBridgeError);
  });

  it("bounds the prompt budget below the Windows command-line limit", () => {
    expect(MAX_AGY_PROMPT_CHARS).toBeLessThan(32_767);
  });
});

describe("entrenador prompt stays inside the agy command-line budget", () => {
  it("drops the oldest history turns instead of overflowing", async () => {
    const { buildEntrenadorPrompt } = await import("@/lib/entrenador/prompt");
    const hugeHistory = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "entrenador") as "user" | "entrenador",
      content: "x".repeat(8_000),
    }));
    const prompt = buildEntrenadorPrompt(hugeHistory, "última pregunta");
    expect(prompt.length).toBeLessThanOrEqual(MAX_AGY_PROMPT_CHARS);
    // The system prompt and the current message must survive the trimming.
    expect(prompt).toContain("Entrenador de Supervivencia para Parciales");
    expect(prompt).toContain("última pregunta");
  });
});
