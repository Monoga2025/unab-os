import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  runCodexTutor,
  unavailableTutorResult,
  type CodexAppServerInvocation,
} from "@/lib/ai/codex-app-server";

const validResult = JSON.stringify({
  reply: "Compare the forces first. What direction did you choose as positive?",
  evidenceSummary: "The learner has not yet described an approach.",
  confidence: "low",
  observedMasterySignal: "not_observed",
  suggestedNextAction: "continue_topic",
});

describe("Codex app-server tutor adapter", () => {
  it("degrades transparently without fabricating tutor evidence", () => {
    const result = unavailableTutorResult("concept");

    expect(result.reply).toMatch(/no está disponible/i);
    expect(result.evidenceSummary).toMatch(/no se infirió evidencia/i);
    expect(result).toMatchObject({
      confidence: "high",
      observedMasterySignal: "not_observed",
      suggestedNextAction: "continue_topic",
    });
  });

  it("uses local stdio with a locked read-only isolated root and cleans it", async () => {
    let captured: CodexAppServerInvocation | undefined;
    const result = await runCodexTutor({
      prompt: "bounded prompt",
      invoke: async (invocation) => {
        captured = invocation;
        return validResult;
      },
    });

    expect(result.reply).toMatch(/Compare the forces/);
    expect(captured?.command).toBe("codex");
    expect(captured?.args).toEqual(["app-server"]);
    expect(captured?.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        method: "initialize",
        params: expect.objectContaining({ capabilities: { experimentalApi: true } }),
      }),
      expect.objectContaining({
        method: "thread/start",
        params: expect.objectContaining({
          approvalPolicy: "never",
          permissions: "unab-tutor",
          cwd: captured?.cwd,
          dynamicTools: [],
          environments: [],
          config: {
            default_permissions: "unab-tutor",
            permissions: {
              "unab-tutor": {
                // La clave debe ser "~/": codex-cli rechaza el literal "/"
                // ("filesystem path `/` must be absolute, use `~/...`, or start
                // with `:`") y eso hacía fallar thread/start en cada turno real.
                filesystem: { "~/": "deny", [captured!.cwd]: "read" },
                network: { enabled: false },
              },
            },
          },
        }),
      }),
      expect.objectContaining({
        method: "turn/start",
        params: expect.not.objectContaining({ sandboxPolicy: expect.anything() }),
      }),
    ]));
    expect(JSON.stringify(captured?.messages)).not.toMatch(/sandbox|shellCommand|process\/|fs\/|dynamicTools\":\[[^\]]|websocket/i);
    await expect(access(captured!.cwd)).rejects.toThrow();
  });

  it("rejects output outside the validated tutor result contract", async () => {
    await expect(runCodexTutor({ prompt: "bounded prompt", invoke: async () => '{"reply":"only"}' }))
      .rejects.toThrow(/invalid tutoring result/);
  });

  const realSmoke = process.env.RUN_CODEX_APP_SERVER_SMOKE === "1" ? it : it.skip;
  realSmoke("completes one bounded turn through the installed App Server", async () => {
    const result = await runCodexTutor({
      prompt: `Return ONLY this JSON object with no markdown: {"reply":"Start by naming the known quantities.","evidenceSummary":"Runtime permission-profile smoke test.","confidence":"low","observedMasterySignal":"not_observed","suggestedNextAction":"continue_topic"}`,
    });

    expect(result).toEqual({
      reply: "Start by naming the known quantities.",
      evidenceSummary: "Runtime permission-profile smoke test.",
      confidence: "low",
      observedMasterySignal: "not_observed",
      suggestedNextAction: "continue_topic",
    });
  }, 50_000);
});
