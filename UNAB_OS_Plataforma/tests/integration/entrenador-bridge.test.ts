import { describe, expect, it } from "vitest";
import {
  CODEX_CHAT_TIMEOUT_MS,
  MAX_CODEX_CHAT_OUTPUT_BYTES,
  extractAssistantText,
  runCodexChat,
  type CodexChatInvocation,
} from "@/lib/ai/codex-chat";

describe("entrenador Codex chat adapter", () => {
  it("exposes the bounded invocation constants", () => {
    expect(CODEX_CHAT_TIMEOUT_MS).toBe(45_000);
    expect(MAX_CODEX_CHAT_OUTPUT_BYTES).toBe(256 * 1024);
  });

  it("returns free-form assistant text and never rejects non-JSON replies", async () => {
    const reply = await runCodexChat({
      prompt: "Explícame Thevenin",
      invoke: async () => "Primero apagá las fuentes independientes. Luego $R_{Th} = V_{oc}/I_{sc}$.",
    });

    expect(reply).toContain("$R_{Th} = V_{oc}/I_{sc}$");
  });

  it("returns a JSON object that is not the tutor schema instead of throwing", async () => {
    const raw = '{"note":"free text, not TutorAssistantResult"}';
    const reply = await runCodexChat({ prompt: "hola", invoke: async () => raw });
    expect(reply).toBe(raw);
  });

  it("extracts the LAST observed assistant text from the event stream", () => {
    const stream = [
      JSON.stringify({ params: { item: { text: "primero" } } }),
      JSON.stringify({ result: { text: "segundo" } }),
      JSON.stringify({ params: { item: { text: "  tercero  " } } }),
    ].join("\n");

    expect(extractAssistantText(stream)).toBe("tercero");
  });

  it("throws a clear error when no assistant text was observed", async () => {
    await expect(runCodexChat({ prompt: "hola", invoke: async () => "   \n  " }))
      .rejects.toThrow(/no assistant text/);
  });

  it("sends the locked, no-network sandbox over the same stdio transport", async () => {
    let captured: CodexChatInvocation | undefined;
    await runCodexChat({
      prompt: "prompt acotado",
      invoke: async (invocation) => {
        captured = invocation;
        return "respuesta";
      },
    });

    expect(captured?.command).toBe("codex");
    expect(captured?.args).toEqual(["app-server"]);
    expect(captured?.timeoutMs).toBe(CODEX_CHAT_TIMEOUT_MS);
    expect(captured?.maxOutputBytes).toBe(MAX_CODEX_CHAT_OUTPUT_BYTES);
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
          config: expect.objectContaining({
            default_permissions: "unab-tutor",
            permissions: expect.objectContaining({
              "unab-tutor": expect.objectContaining({ network: { enabled: false } }),
            }),
          }),
        }),
      }),
      expect.objectContaining({
        method: "turn/start",
        params: expect.objectContaining({
          threadId: "$THREAD_ID",
          approvalPolicy: "never",
          input: [{ type: "text", text: "prompt acotado" }],
        }),
      }),
    ]));
  });

  it("never imports or calls the validated tutor schema", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../../lib/ai/codex-chat.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toMatch(/from\s+["']@\/lib\/domain\/tutor["']/);
    expect(source).not.toMatch(/validateTutorAssistantResult\s*\(/);
  });
});
