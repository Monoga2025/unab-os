import { describe, expect, it } from "vitest";
import { runCodexTutor } from "@/lib/ai/codex-app-server";

/**
 * Regression guards for the Codex app-server adapter, based on a REAL
 * `codex app-server` session captured from codex-cli 0.155.1.
 *
 * Two bugs made every tutor turn impossible:
 *   1. The sandbox used a bare "/" filesystem key, which codex-cli rejects with
 *      "filesystem path `/` must be absolute, use `~/...`, or start with `:`",
 *      failing thread/start so no turn ever ran.
 *   2. The reply was read from `params.item.text` / `result.text`, shapes that
 *      never appear. The real reply is an `item/completed` notification with
 *      `params.item.type === "agentMessage"` and text in `params.item.content[]`.
 */
const validTutorPayload = JSON.stringify({
  reply: "Respuesta del tutor",
  evidenceSummary: "Resumen de evidencia",
  confidence: "low",
  observedMasterySignal: "not_observed",
  suggestedNextAction: "continue_topic",
});

const agentMessageEvent = (text: string) =>
  JSON.stringify({
    method: "item/completed",
    params: { item: { type: "agentMessage", id: "a1", content: [{ type: "text", text }] } },
  });

describe("codex-app-server sandbox configuration regression guard", () => {
  it("sends \"~/\" as the filesystem deny key and never a bare \"/\"", async () => {
    let captured = "";
    await runCodexTutor({
      prompt: "x",
      invoke: async (invocation) => {
        captured = JSON.stringify(invocation.messages);
        return validTutorPayload;
      },
    });
    expect(captured).toContain('"~/":"deny"');
    expect(captured).toContain('"network":{"enabled":false}');
    expect(captured).not.toContain('filesystem":{"/":');
  });
});

describe("codex-app-server reply extraction (real app-server shapes)", () => {
  it("reads the tutor result from an agentMessage content array", async () => {
    const result = await runCodexTutor({
      prompt: "x",
      invoke: async () => agentMessageEvent(validTutorPayload),
    });
    expect(result.reply).toBe("Respuesta del tutor");
  });

  it("also accepts the payload when the model wraps it in a json code fence", async () => {
    const fenced = "```json\n" + validTutorPayload + "\n```";
    const result = await runCodexTutor({
      prompt: "x",
      invoke: async () => agentMessageEvent(fenced),
    });
    expect(result.reply).toBe("Respuesta del tutor");
  });
});
