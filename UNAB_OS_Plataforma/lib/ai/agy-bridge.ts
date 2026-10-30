// Bridge to the LOCAL Antigravity CLI (`agy`).
//
// Unlike `codex-app-server.ts` — which speaks JSON-RPC over stdio and needs a
// handshake (initialize → thread/start → turn/start) — `agy` exposes a single
// non-interactive print mode:
//
//     agy -p "<prompt>" --output-format text --sandbox
//
// VERIFIED against agy 1.2.12 on this machine: exit 0, plain text on stdout,
// ~11s for a short answer. This is the preferred provider for the Entrenador
// module because the local Codex account has a small quota, while Antigravity
// is effectively unlimited for study use.
//
// Security posture: we pass `--sandbox` (terminal restrictions) and we do NOT
// pass `--dangerously-skip-permissions`. This adapter never builds a shell
// string: the prompt travels as a single argv element from an argument array.
import { spawn } from "node:child_process";

/** `agy` is an agentic CLI; give it room, but never unbounded. */
export const AGY_TIMEOUT_MS = 120_000;
export const MAX_AGY_OUTPUT_BYTES = 256 * 1024;

/**
 * Windows caps a whole command line at ~32767 characters and the prompt is one
 * argv element, so the composed prompt must stay well under that. The caller
 * (prompt builder) bounds the history; this is the hard backstop.
 */
export const MAX_AGY_PROMPT_CHARS = 24_000;

export type AgyInvocation = {
  command: string;
  args: string[];
  timeoutMs: number;
  maxOutputBytes: number;
};

export type RunAgyInput = {
  prompt: string;
  /** Optional Antigravity model id, e.g. "gemini-3.8-flash-high". */
  model?: string;
  /** Injection seam so the adapter is unit testable without spawning agy. */
  invoke?: (invocation: AgyInvocation) => Promise<string>;
};

/** Thrown when agy exits non-zero or prints nothing usable. */
export class AgyBridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgyBridgeError";
  }
}

/**
 * Builds the argv for one non-interactive turn.
 * `--output-format text` keeps stdout a plain string (no JSON envelope), and
 * `--sandbox` restricts terminal access.
 */
export function buildAgyArgs(prompt: string, model?: string): string[] {
  const args = ["-p", prompt, "--output-format", "text", "--sandbox"];
  if (model && model.trim()) args.push("--model", model.trim());
  return args;
}

function defaultInvoke(invocation: AgyInvocation): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(invocation.command, invocation.args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        // Best effort: the process may already be gone.
      }
      if (error) reject(error);
      else resolve(stdout);
    };

    const timer = setTimeout(() => finish(new AgyBridgeError("agy timed out.")), invocation.timeoutMs);

    child.on("error", (error) => finish(new AgyBridgeError(`agy could not start: ${error.message}`)));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (Buffer.byteLength(stderr) > invocation.maxOutputBytes) finish(new AgyBridgeError("agy stderr exceeded its bound."));
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > invocation.maxOutputBytes) finish(new AgyBridgeError("agy output exceeded its bound."));
    });
    child.on("exit", (code) => {
      if (settled) return;
      if (code === 0) finish();
      else finish(new AgyBridgeError(`agy exited with code ${code}: ${stderr.trim().slice(0, 300)}`));
    });
  });
}

/**
 * Runs one non-interactive Antigravity turn and returns its plain-text answer.
 * Throws instead of fabricating when agy fails or prints nothing.
 */
export async function runAgy(input: RunAgyInput): Promise<string> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new AgyBridgeError("agy received an empty prompt.");
  if (prompt.length > MAX_AGY_PROMPT_CHARS) {
    throw new AgyBridgeError("agy prompt exceeded the safe command-line budget.");
  }

  const invocation: AgyInvocation = {
    command: process.env.AGY_BIN || "agy",
    args: buildAgyArgs(prompt, input.model ?? process.env.AGY_MODEL),
    timeoutMs: AGY_TIMEOUT_MS,
    maxOutputBytes: MAX_AGY_OUTPUT_BYTES,
  };

  const raw = await (input.invoke ?? defaultInvoke)(invocation);
  const text = raw.trim();
  if (!text) throw new AgyBridgeError("agy returned no text.");
  return text;
}
