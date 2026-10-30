import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { safeTutorResponse } from "@/lib/ai/codex-app-server";

const route = readFileSync(resolve(process.cwd(), "app/api/tutor/route.ts"), "utf8");

describe("tutor independent-attempt boundary", () => {
  it("does not invoke Codex for any exercise request before an independent attempt", async () => {
    let invoked = false;
    const response = await safeTutorResponse({
      mode: "exercise",
      hasIndependentAttempt: false,
      request: "Help me understand where to begin",
      invoke: async () => {
        invoked = true;
        return "{}";
      },
    });

    expect(invoked).toBe(false);
    expect(response).toMatchObject({ kind: "retrieval_fallback", stateWritten: false });
    expect(response.text).toMatch(/intento independiente/i);
    expect(response.text).not.toMatch(/solución completa|la respuesta es|x\s*=/i);
  });

  it("allows concept study without treating it as exercise solving", async () => {
    let invoked = false;
    const response = await safeTutorResponse({
      mode: "concept",
      hasIndependentAttempt: false,
      request: "Explain the concept of vector decomposition",
      invoke: async () => {
        invoked = true;
        return JSON.stringify({
          reply: "A vector can be represented by components along chosen axes.",
          evidenceSummary: "The learner requested a conceptual explanation.",
          confidence: "high",
          observedMasterySignal: "not_observed",
          suggestedNextAction: "continue_topic",
        });
      },
    });

    expect(invoked).toBe(true);
    expect(response).toMatchObject({ kind: "feedback", stateWritten: false });
  });

  it("still validates model output after an independent attempt", async () => {
    const response = await safeTutorResponse({
      mode: "exercise",
      hasIndependentAttempt: true,
      request: "Review my approach",
      invoke: async () => JSON.stringify({
        reply: "Your force balance is consistent.",
        evidenceSummary: "The learner supplied a force balance.",
        confidence: "medium",
        observedMasterySignal: "developing",
        suggestedNextAction: "practice",
      }),
    });

    expect(response).toMatchObject({ kind: "feedback", stateWritten: false });
  });

  it("accepts only an optional typed attemptId in the tutor request boundary", () => {
    expect(route).toMatch(/attemptId\?: unknown/);
    expect(route).toMatch(/allowedKeys[\s\S]*?["']attemptId["']/);
    expect(route).toMatch(/const attemptId = optionalUuid\(body\.attemptId\)/);
    expect(route).toMatch(/requestValidation\.value\.mode === ["']concept["'][\s\S]*?attemptId/);
  });

  it("authorizes the exact independent attempt before exercise mode can invoke Codex", () => {
    expect(route).toMatch(/\.from\(\s*["']attempts["']\s*\)\s*\.select\(\s*["']id["']\s*\)[\s\S]*?\.eq\(\s*["']id["']\s*,\s*attemptId\s*\)[\s\S]*?\.eq\(\s*["']user_id["']\s*,\s*userId\s*\)[\s\S]*?\.eq\(\s*["']objective_id["']\s*,\s*body\.objectiveId\s*\)[\s\S]*?\.eq\(\s*["']help_level["']\s*,\s*["']none["']\s*\)/);
    expect(route).not.toMatch(/\.from\(\s*["']attempts["']\s*\)\.select\(\s*["']id["']\s*\)\.eq\(\s*["']user_id["']/);

    const safeBranch = route.indexOf('requestValidation.value.mode === "exercise" && !hasIndependentAttempt');
    const codexInvocation = route.indexOf("assistant = await runCodexTutor(");
    expect(safeBranch).toBeGreaterThan(-1);
    expect(codexInvocation).toBeGreaterThan(safeBranch);
  });
});
