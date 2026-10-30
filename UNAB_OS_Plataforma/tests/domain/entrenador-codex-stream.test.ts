import { describe, expect, it } from "vitest";
import {
  CodexChatTurnError,
  extractAssistantText,
  extractTurnFailure,
  runCodexChat,
} from "@/lib/ai/codex-chat";

/**
 * Fixtures captured from a REAL `codex app-server` session (codex-cli 0.155.1).
 *
 * The authoritative reply shape is an `item/completed` notification whose
 * `params.item.type` is `"agentMessage"`, with the text inside
 * `params.item.content[].text`. Neither `params.item.text` nor `result.text`
 * ever appears in the real stream — assuming they do makes every turn look
 * like a failure. These tests lock that in.
 */
const agentMessage = (text: string, id = "msg-1") =>
  JSON.stringify({
    method: "item/completed",
    params: {
      item: { type: "agentMessage", id, content: [{ type: "text", text, text_elements: [] }] },
      threadId: "t1",
      turnId: "u1",
      completedAtMs: 1,
    },
    emittedAtMs: 1,
  });

const userMessage = (text: string) =>
  JSON.stringify({
    method: "item/completed",
    params: { item: { type: "userMessage", id: "u", content: [{ type: "text", text }] } },
    emittedAtMs: 1,
  });

const failedTurn = (message: string) =>
  JSON.stringify({
    method: "turn/completed",
    params: {
      threadId: "t1",
      turn: { id: "u1", items: [], status: "failed", error: { message, codexErrorInfo: "usageLimitExceeded" } },
    },
    emittedAtMs: 1,
  });

const okTurn = () =>
  JSON.stringify({
    method: "turn/completed",
    params: { threadId: "t1", turn: { id: "u1", items: [], status: "completed" } },
    emittedAtMs: 1,
  });

describe("codex-chat stream extraction (real app-server shapes)", () => {
  it("reads the assistant text from an agentMessage content array", () => {
    const raw = [userMessage("hola"), agentMessage("La fórmula es $V_{Th}=V_{oc}$."), okTurn()].join("\n");
    expect(extractAssistantText(raw)).toBe("La fórmula es $V_{Th}=V_{oc}$.");
  });

  it("ignores the user's own message and returns the last agent message", () => {
    const raw = [
      agentMessage("primera respuesta", "a1"),
      agentMessage("segunda respuesta", "a2"),
      userMessage("texto del usuario"),
      okTurn(),
    ].join("\n");
    expect(extractAssistantText(raw)).toBe("segunda respuesta");
  });

  it("joins multiple content parts of one agent message", () => {
    const raw = JSON.stringify({
      method: "item/completed",
      params: { item: { type: "agentMessage", id: "a", content: [{ text: "Parte A. " }, { text: "Parte B." }] } },
    });
    expect(extractAssistantText(raw)).toBe("Parte A. Parte B.");
  });

  it("still tolerates the legacy params.item.text shape", () => {
    const raw = JSON.stringify({ method: "item/completed", params: { item: { text: "respuesta legacy" } } });
    expect(extractAssistantText(raw)).toBe("respuesta legacy");
  });

  it("falls back to the raw payload when nothing structured is present (injected fakes)", () => {
    expect(extractAssistantText("texto plano inyectado")).toBe("texto plano inyectado");
  });

  it("throws when the stream carries no usable text at all", () => {
    expect(() => extractAssistantText("   ")).toThrow();
  });
});

describe("codex-chat turn failure detection", () => {
  it("surfaces the real reason from a failed turn", () => {
    const raw = [userMessage("hola"), failedTurn("You've hit your usage limit. Upgrade to Pro.")].join("\n");
    expect(extractTurnFailure(raw)).toMatch(/usage limit/i);
  });

  it("returns null for a completed turn", () => {
    expect(extractTurnFailure(okTurn())).toBeNull();
  });

  it("throws CodexChatTurnError instead of fabricating a reply when the turn failed", async () => {
    const raw = [failedTurn("You've hit your usage limit."), okTurn()].join("\n");
    await expect(
      runCodexChat({ prompt: "x", invoke: async () => raw }),
    ).rejects.toBeInstanceOf(CodexChatTurnError);
  });

  it("returns the text end-to-end when the turn succeeds (injected transport)", async () => {
    const raw = [agentMessage("respuesta final"), okTurn()].join("\n");
    await expect(runCodexChat({ prompt: "x", invoke: async () => raw })).resolves.toBe("respuesta final");
  });
});

describe("codex-chat sandbox configuration regression guard", () => {
  // codex-cli rejects the literal "/" as a filesystem key:
  //   "filesystem path `/` must be absolute, use `~/...`, or start with `:`"
  // which makes thread/start fail and kills every turn. Guard against regressing.
  it("never sends a bare \"/\" filesystem path", async () => {
    let captured = "";
    await runCodexChat({
      prompt: "x",
      invoke: async (invocation) => {
        captured = JSON.stringify(invocation.messages);
        return agentMessage("ok");
      },
    });
    expect(captured).not.toContain('filesystem":{"\\":');
    expect(captured).toContain('"~/":"deny"');
    expect(captured).toContain('"enabled":false');
  });
});
