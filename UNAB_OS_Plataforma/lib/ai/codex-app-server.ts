import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validateTutorAssistantResult,
  type TutorAssistantResult,
  type TutorMode,
} from "@/lib/domain/tutor";

const CODEX_TIMEOUT_MS = 45_000;
const MAX_CODEX_OUTPUT_BYTES = 256 * 1024;

export type TutorReply = {
  kind: "hint" | "retrieval_fallback" | "feedback";
  text: string;
  stateWritten: false;
};

export type CodexAppServerInvocation = {
  command: "codex";
  args: ["app-server"];
  cwd: string;
  messages: readonly Record<string, unknown>[];
  timeoutMs: number;
  maxOutputBytes: number;
};

type RunCodexTutorInput = {
  prompt: string;
  invoke?: (invocation: CodexAppServerInvocation) => Promise<string>;
};

const fallbackResult: TutorAssistantResult = {
  reply: "Hacé un intento independiente: explicá qué entendés del problema y cuál sería tu primer paso. A partir de eso puedo darte una pista concreta sin resolver el ejercicio por vos.",
  evidenceSummary: "No se obtuvo una respuesta estructurada y segura del tutor.",
  confidence: "low",
  observedMasterySignal: "not_observed",
  suggestedNextAction: "continue_topic",
};

export function unavailableTutorResult(mode: TutorMode): TutorAssistantResult {
  return {
    reply: mode === "concept"
      ? "El modelo del Tutor IA no está disponible en este momento. Para no inventarte una explicación, organizá tu idea con estas tres preguntas: ¿cuál es el concepto central?, ¿qué ejemplo concreto lo representa? y ¿qué parte exacta todavía no podés justificar? Conservá ese razonamiento para retomarlo cuando el modelo vuelva a estar conectado."
      : "El modelo del Tutor IA no está disponible en este momento. Conservá tu intento independiente y marcá el primer paso donde dejaste de poder justificar el procedimiento; no voy a inventar una solución mientras el modelo está desconectado.",
    evidenceSummary: "El servicio de modelo no estuvo disponible; no se infirió evidencia de dominio.",
    confidence: "high",
    observedMasterySignal: "not_observed",
    suggestedNextAction: mode === "concept" ? "continue_topic" : "practice",
  };
}

function buildMessages(cwd: string, prompt: string): Record<string, unknown>[] {
  return [
    {
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "unab-os-tutor", version: "1.0.0" },
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
              // y hace fallar thread/start entero: el turno nunca arranca.
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

function parseAssistantResult(raw: string): TutorAssistantResult {
  const candidates = [raw.trim()];
  for (const line of raw.split("\n")) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const params = event.params as Record<string, unknown> | undefined;
      const item = params?.item as Record<string, unknown> | undefined;
      // Real shape (codex-cli 0.155.1): the agent's reply arrives as an
      // `item/completed` notification whose `params.item.type` is "agentMessage",
      // with the text inside `params.item.content[].text`.
      if (item?.type === "agentMessage" && Array.isArray(item.content)) {
        const text = (item.content as { text?: unknown }[])
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join("")
          .trim();
        if (text) candidates.unshift(text);
      }
      // Legacy tolerance: `params.item.text` / `result.text` never appear in the
      // real stream, but older CLIs and injected test fixtures still use them.
      if (typeof item?.text === "string") candidates.unshift(item.text.trim());
      const result = event.result as Record<string, unknown> | undefined;
      if (typeof result?.text === "string") candidates.unshift(result.text.trim());
    } catch {
      // App-server output may include the final JSON directly in injected tests.
    }
  }

  for (const candidate of candidates) {
    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? candidate;
    try {
      const validation = validateTutorAssistantResult(JSON.parse(fenced));
      if (validation.valid) return validation.value;
    } catch {
      // Try the next bounded candidate.
    }
  }
  throw new Error("Codex app-server returned an invalid tutoring result.");
}

async function invokeAppServer(invocation: CodexAppServerInvocation): Promise<string> {
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
    const timer = setTimeout(() => finish(new Error("Codex app-server timed out.")), invocation.timeoutMs);

    child.on("error", (error) => finish(error));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (Buffer.byteLength(stderr) > invocation.maxOutputBytes) finish(new Error("Codex app-server stderr exceeded its bound."));
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > invocation.maxOutputBytes) {
        finish(new Error("Codex app-server output exceeded its bound."));
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
              finish(new Error(`Codex app-server rejected thread/start: ${JSON.stringify(message.error).slice(0, 800)}`));
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
            finish(new Error(`Codex app-server rejected turn/start: ${JSON.stringify(message.error).slice(0, 800)}`));
          }
        } catch {
          // Preserve the bounded stream; malformed output is rejected by result validation.
        }
      }
    });
    child.on("exit", (code) => {
      if (!settled) code === 0 ? finish() : finish(new Error(`Codex app-server exited with code ${code}: ${stderr.slice(0, 400)}`));
    });

    write(invocation.messages[0]);
  });
}

export async function runCodexTutor(input: RunCodexTutorInput): Promise<TutorAssistantResult> {
  const cwd = await mkdtemp(join(tmpdir(), "unab-codex-tutor-"));
  try {
    const invocation: CodexAppServerInvocation = {
      command: "codex",
      args: ["app-server"],
      cwd,
      messages: buildMessages(cwd, input.prompt),
      timeoutMs: CODEX_TIMEOUT_MS,
      maxOutputBytes: MAX_CODEX_OUTPUT_BYTES,
    };
    const raw = await (input.invoke ?? invokeAppServer)(invocation);
    return parseAssistantResult(raw);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

/** Compatibility boundary for the earlier hint-only endpoint and its independent-attempt tests. */
export async function safeTutorResponse(input: {
  mode?: TutorMode;
  hasIndependentAttempt: boolean;
  request: string;
  invoke?: () => Promise<string>;
}): Promise<TutorReply> {
  const mode = input.mode ?? "exercise";
  if (mode === "exercise" && !input.hasIndependentAttempt) {
    return { kind: "retrieval_fallback", text: fallbackResult.reply, stateWritten: false };
  }
  try {
    const result = await runCodexTutor({
      prompt: input.request,
      invoke: input.invoke ? async () => input.invoke!() : undefined,
    });
    return { kind: "feedback", text: result.reply, stateWritten: false };
  } catch {
    return { kind: "retrieval_fallback", text: fallbackResult.reply, stateWritten: false };
  }
}
