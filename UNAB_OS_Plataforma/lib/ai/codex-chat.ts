// Sibling of `lib/ai/codex-app-server.ts`.
//
// It shares the exact same transport (JSON-RPC over the LOCAL Codex app-server
// via stdio) and the exact same no-network, non-mutating sandbox. What differs
// is the contract: this adapter deliberately returns free-form assistant TEXT
// (prose + LaTeX) instead of the rigid, validated `TutorAssistantResult` JSON.
// It must never call `validateTutorAssistantResult` and must never reject a
// reply just because it is not that JSON shape.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CODEX_CHAT_TIMEOUT_MS = 45_000;
export const MAX_CODEX_CHAT_OUTPUT_BYTES = 256 * 1024;

export type CodexChatInvocation = {
  command: "codex";
  args: ["app-server"];
  cwd: string;
  messages: readonly Record<string, unknown>[];
  timeoutMs: number;
  maxOutputBytes: number;
};

export type RunCodexChatInput = {
  prompt: string;
  /** Injection seam so the adapter can be unit tested without spawning Codex. */
  invoke?: (invocation: CodexChatInvocation) => Promise<string>;
};

function buildMessages(cwd: string, prompt: string): Record<string, unknown>[] {
  return [
    {
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "unab-os-entrenador", version: "1.0.0" },
        capabilities: { experimentalApi: true },
      },
    },
    { method: "initialized", params: {} },
    {
      id: 2,
      method: "thread/start",
      params: {
        cwd,
        approvalPolicy: "never",
        permissions: "unab-tutor",
        dynamicTools: [],
        environments: [],
        config: {
          default_permissions: "unab-tutor",
          permissions: {
            "unab-tutor": {
              // OJO: la clave debe ser "~/" (o ruta absoluta, o prefijo ":").
              // El literal "/" es rechazado por codex-cli con
              // "filesystem path `/` must be absolute, use `~/...`, or start with `:`"
              // y hace fallar thread/start por completo.
              filesystem: { "~/": "deny", [cwd]: "read" },
              network: { enabled: false },
            },
          },
        },
      },
    },
    {
      id: 3,
      method: "turn/start",
      params: {
        threadId: "$THREAD_ID",
        input: [{ type: "text", text: prompt }],
        approvalPolicy: "never",
      },
    },
  ];
}

type CodexContentPart = { type?: unknown; text?: unknown };

/**
 * Pulls the assistant text out of the app-server event stream.
 *
 * VERIFIED against codex-cli 0.155.1: the reply arrives as an `item/completed`
 * notification whose `params.item.type` is `"agentMessage"`, carrying the text
 * inside `params.item.content[].text`. The shapes the older adapter assumed
 * (`params.item.text`, `result.text`) DO NOT EXIST in the real stream — looking
 * only for those yields nothing and makes every turn look like a failure.
 *
 * The legacy shapes are still tolerated so older CLIs and injected test fakes
 * keep working, but the agent-message shape is the authoritative one.
 */
export function extractAssistantText(raw: string): string {
  let agentMessageText: string | null = null;
  const legacyTexts: string[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const params = event.params as Record<string, unknown> | undefined;
      const item = params?.item as Record<string, unknown> | undefined;

      // Real shape: agentMessage whose content is an array of text parts.
      if (item?.type === "agentMessage" && Array.isArray(item.content)) {
        const text = (item.content as CodexContentPart[])
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join("")
          .trim();
        if (text) agentMessageText = text;
      }

      // Tolerated legacy shapes (older CLIs / injected fakes).
      if (typeof item?.text === "string" && item.text.trim()) legacyTexts.push(item.text.trim());
      const result = event.result as Record<string, unknown> | undefined;
      if (typeof result?.text === "string" && result.text.trim()) legacyTexts.push(result.text.trim());
    } catch {
      // Line-buffered JSON; non-JSON lines fall through to the raw fallback.
    }
  }

  if (agentMessageText) return agentMessageText;
  if (legacyTexts.length) return legacyTexts[legacyTexts.length - 1];
  const whole = raw.trim();
  if (whole) return whole;
  throw new Error("Codex chat app-server returned no assistant text.");
}

/** Best-effort read of the failure a turn reported, for honest UI messages. */
export function extractTurnFailure(raw: string): string | null {
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.method !== "turn/completed") continue;
      const turn = (event.params as Record<string, unknown> | undefined)?.turn as Record<string, unknown> | undefined;
      if (turn?.status !== "failed") continue;
      const error = turn.error as Record<string, unknown> | undefined;
      if (typeof error?.message === "string") return error.message;
      return "Codex reported a failed turn.";
    } catch {
      // Ignore malformed lines.
    }
  }
  return null;
}

async function invokeAppServer(invocation: CodexChatInvocation): Promise<string> {
  return new Promise((resolve, reject) => {
    const { OPENAI_API_KEY: _openAiApiKey, CODEX_API_KEY: _codexApiKey, ...chatGptEnvironment } = process.env;
    const child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: chatGptEnvironment,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let threadId: string | null = null;
    let turnSent = false;
    let initialized = false;
    let pendingLine = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      if (error) reject(error);
      else resolve(stdout);
    };
    const write = (message: Record<string, unknown>) => child.stdin.write(`${JSON.stringify(message)}\n`);
    const timer = setTimeout(() => finish(new Error("Codex chat app-server timed out.")), invocation.timeoutMs);

    child.on("error", (error) => finish(error));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (Buffer.byteLength(stderr) > invocation.maxOutputBytes) finish(new Error("Codex chat app-server stderr exceeded its bound."));
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > invocation.maxOutputBytes) {
        finish(new Error("Codex chat app-server output exceeded its bound."));
        return;
      }
      const lines = `${pendingLine}${chunk}`.split("\n");
      pendingLine = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as Record<string, unknown>;
          if (message.id === 1 && !initialized) {
            initialized = true;
            write(invocation.messages[1]);
            write(invocation.messages[2]);
          }
          if (message.id === 2) {
            if (message.error) {
              finish(new Error(`Codex chat app-server rejected thread/start: ${JSON.stringify(message.error).slice(0, 800)}`));
              continue;
            }
            const result = message.result as Record<string, unknown> | undefined;
            const thread = result?.thread as Record<string, unknown> | undefined;
            if (typeof thread?.id === "string") threadId = thread.id;
            if (threadId && !turnSent) {
              turnSent = true;
              const turn = structuredClone(invocation.messages[3]);
              const params = turn.params as Record<string, unknown>;
              params.threadId = threadId;
              write(turn);
            }
          }
          if (message.method === "turn/completed") finish();
          if (message.id === 3 && message.error) {
            finish(new Error(`Codex chat app-server rejected turn/start: ${JSON.stringify(message.error).slice(0, 800)}`));
          }
        } catch {
          // Preserve the bounded stream; malformed output is handled by the extractor.
        }
      }
    });
    child.on("exit", (code) => {
      if (!settled) code === 0 ? finish() : finish(new Error(`Codex chat app-server exited with code ${code}: ${stderr.slice(0, 400)}`));
    });

    write(invocation.messages[0]);
  });
}

/** Thrown when the turn ran but Codex reported a failure (quota, auth, etc.). */
export class CodexChatTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexChatTurnError";
  }
}

/**
 * Runs one bounded turn against the local Codex app-server and returns the
 * assistant's free-form text. Throws (not fabricates) when nothing usable was
 * observed; callers decide the honest fallback message.
 */
export async function runCodexChat(input: RunCodexChatInput): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "unab-codex-chat-"));
  try {
    const invocation: CodexChatInvocation = {
      command: "codex",
      args: ["app-server"],
      cwd,
      messages: buildMessages(cwd, input.prompt),
      timeoutMs: CODEX_CHAT_TIMEOUT_MS,
      maxOutputBytes: MAX_CODEX_CHAT_OUTPUT_BYTES,
    };
    const raw = await (input.invoke ?? invokeAppServer)(invocation);
    // A failed turn emits no assistant message at all, so surface the real
    // reason (e.g. "You've hit your usage limit") instead of a generic failure.
    const failure = extractTurnFailure(raw);
    if (failure) throw new CodexChatTurnError(failure);
    return extractAssistantText(raw);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}
