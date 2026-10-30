import { timingSafeEqual } from "node:crypto";

export const JARVIS_AI_MODEL = "gpt-5.4-nano";
export const JARVIS_AI_MAX_OUTPUT_TOKENS = 1_200;
export const JARVIS_AI_TIMEOUT_MS = 25_000;
export const JARVIS_AI_MAX_REQUEST_BYTES = 96 * 1024;
export const JARVIS_AI_MAX_RESPONSE_BYTES = 256 * 1024;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_TOTAL_MESSAGE_CHARS = 48_000;
const MAX_TOOLS = 4;
const MAX_TOOL_DESCRIPTION_CHARS = 600;
const MAX_TOOL_SCHEMA_CHARS = 8_000;
const MAX_TOOL_CALLS_PER_MESSAGE = 4;
const MAX_TOOL_ARGUMENT_CHARS = 4_096;
const TOOL_CALL_ID = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_TOOL_NAMES = new Set([
  "crear_tarea",
  "listar_tareas",
  "completar_tarea",
  "programar_recordatorio",
]);

type JsonRecord = Record<string, unknown>;

export type JarvisAiValidationError = {
  ok: false;
  status: 400 | 413;
  code: string;
  message: string;
  param: string | null;
};

export type JarvisAiUpstreamRequest = {
  model: typeof JARVIS_AI_MODEL;
  messages: JsonRecord[];
  tools?: JsonRecord[];
  tool_choice: "auto" | "none";
  parallel_tool_calls?: false;
  reasoning_effort: "none";
  max_completion_tokens: typeof JARVIS_AI_MAX_OUTPUT_TOKENS;
  stream: false;
  store: false;
};

export type JarvisAiValidationResult =
  | { ok: true; value: JarvisAiUpstreamRequest }
  | JarvisAiValidationError;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string, param: string | null = null): JarvisAiValidationError {
  return { ok: false, status: 400, code: "invalid_request", message, param };
}

function copyJsonRecord(value: JsonRecord): JsonRecord | null {
  const serialized = JSON.stringify(value);
  if (!serialized) return null;
  return JSON.parse(serialized) as JsonRecord;
}

function sanitizeTools(value: unknown):
  | { ok: true; tools: JsonRecord[]; names: Set<string> }
  | JarvisAiValidationError {
  if (value === undefined) return { ok: true, tools: [], names: new Set() };
  if (!Array.isArray(value) || value.length > MAX_TOOLS) {
    return invalid(`tools must be an array with at most ${MAX_TOOLS} functions.`, "tools");
  }

  const tools: JsonRecord[] = [];
  const names = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || entry.type !== "function" || !isRecord(entry.function)) {
      return invalid("Only function tools are supported.", "tools");
    }
    const name = entry.function.name;
    if (typeof name !== "string" || !ALLOWED_TOOL_NAMES.has(name) || names.has(name)) {
      return invalid("The request contains an unsupported or duplicate tool.", "tools");
    }
    const description = entry.function.description;
    if (description !== undefined && (typeof description !== "string" || description.length > MAX_TOOL_DESCRIPTION_CHARS)) {
      return invalid("A tool description is invalid or too long.", "tools");
    }
    const parameters = entry.function.parameters;
    if (!isRecord(parameters)) return invalid("Every tool requires an object JSON schema.", "tools");
    const serializedParameters = JSON.stringify(parameters);
    if (serializedParameters.length > MAX_TOOL_SCHEMA_CHARS) {
      return invalid("A tool schema is too large.", "tools");
    }
    const safeParameters = copyJsonRecord(parameters);
    if (!safeParameters) return invalid("A tool schema is invalid.", "tools");

    names.add(name);
    tools.push({
      type: "function",
      function: {
        name,
        ...(description === undefined ? {} : { description }),
        parameters: safeParameters,
      },
    });
  }
  return { ok: true, tools, names };
}

function sanitizeAssistantToolCalls(
  value: unknown,
  offeredTools: Set<string>,
): { ok: true; calls: JsonRecord[]; ids: string[]; chars: number } | JarvisAiValidationError {
  if (value === undefined) return { ok: true, calls: [], ids: [], chars: 0 };
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TOOL_CALLS_PER_MESSAGE) {
    return invalid(`assistant tool_calls must contain 1-${MAX_TOOL_CALLS_PER_MESSAGE} calls.`, "messages");
  }

  const ids = new Set<string>();
  const calls: JsonRecord[] = [];
  let chars = 0;
  for (const entry of value) {
    if (!isRecord(entry) || entry.type !== "function" || !isRecord(entry.function)) {
      return invalid("An assistant tool call is malformed.", "messages");
    }
    const id = entry.id;
    const name = entry.function.name;
    const args = entry.function.arguments;
    if (typeof id !== "string" || !TOOL_CALL_ID.test(id) || ids.has(id)) {
      return invalid("An assistant tool call id is invalid or duplicated.", "messages");
    }
    if (typeof name !== "string" || !offeredTools.has(name)) {
      return invalid("An assistant tool call references an unavailable tool.", "messages");
    }
    if (typeof args !== "string" || args.length > MAX_TOOL_ARGUMENT_CHARS) {
      return invalid("Assistant tool arguments are invalid or too long.", "messages");
    }
    ids.add(id);
    chars += args.length;
    calls.push({ id, type: "function", function: { name, arguments: args } });
  }
  return { ok: true, calls, ids: [...ids], chars };
}

function sanitizeMessages(value: unknown, offeredTools: Set<string>):
  | { ok: true; messages: JsonRecord[] }
  | JarvisAiValidationError {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return invalid(`messages must contain 1-${MAX_MESSAGES} text messages.`, "messages");
  }

  const messages: JsonRecord[] = [];
  const pendingToolCalls = new Set<string>();
  let totalChars = 0;

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.role !== "string") {
      return invalid("Every message requires a supported role.", "messages");
    }
    const role = entry.role;

    if (role === "tool") {
      const content = entry.content;
      const toolCallId = entry.tool_call_id;
      if (typeof content !== "string" || content.length > MAX_MESSAGE_CHARS) {
        return invalid("Tool message content is invalid or too long.", "messages");
      }
      if (typeof toolCallId !== "string" || !pendingToolCalls.delete(toolCallId)) {
        return invalid("A tool message does not match a previous assistant tool call.", "messages");
      }
      totalChars += content.length;
      messages.push({ role, content, tool_call_id: toolCallId });
      continue;
    }

    if (role === "assistant") {
      const content = entry.content;
      if (content !== null && content !== undefined && (typeof content !== "string" || content.length > MAX_MESSAGE_CHARS)) {
        return invalid("Assistant message content is invalid or too long.", "messages");
      }
      const callsResult = sanitizeAssistantToolCalls(entry.tool_calls, offeredTools);
      if (!callsResult.ok) return callsResult;
      if ((content === null || content === undefined || content.length === 0) && callsResult.calls.length === 0) {
        return invalid("An assistant message cannot be empty.", "messages");
      }
      for (const id of callsResult.ids) {
        if (pendingToolCalls.has(id)) return invalid("A tool call id is duplicated in the conversation.", "messages");
        pendingToolCalls.add(id);
      }
      totalChars += (typeof content === "string" ? content.length : 0) + callsResult.chars;
      messages.push({
        role,
        content: content ?? null,
        ...(callsResult.calls.length === 0 ? {} : { tool_calls: callsResult.calls }),
      });
      continue;
    }

    if (role !== "system" && role !== "developer" && role !== "user") {
      return invalid("Only system, developer, user, assistant, and tool roles are supported.", "messages");
    }
    if (typeof entry.content !== "string" || entry.content.length === 0 || entry.content.length > MAX_MESSAGE_CHARS) {
      return invalid("Text message content is empty or too long.", "messages");
    }
    totalChars += entry.content.length;
    messages.push({ role, content: entry.content });
  }

  if (pendingToolCalls.size > 0) {
    return invalid("Every historical assistant tool call requires a matching tool result.", "messages");
  }
  if (totalChars > MAX_TOTAL_MESSAGE_CHARS) {
    return invalid(`Conversation text exceeds ${MAX_TOTAL_MESSAGE_CHARS} characters.`, "messages");
  }
  return { ok: true, messages };
}

export function sanitizeJarvisAiRequest(value: unknown): JarvisAiValidationResult {
  if (!isRecord(value)) return invalid("The request body must be a JSON object.");
  for (const forbidden of ["base_url", "baseURL", "api_key", "apiKey"] as const) {
    if (forbidden in value) return invalid(`${forbidden} cannot be supplied by the client.`, forbidden);
  }
  if (value.stream !== undefined && value.stream !== false) {
    return invalid("Streaming is not supported by this endpoint.", "stream");
  }

  const toolsResult = sanitizeTools(value.tools);
  if (!toolsResult.ok) return toolsResult;
  const messagesResult = sanitizeMessages(value.messages, toolsResult.names);
  if (!messagesResult.ok) return messagesResult;

  return {
    ok: true,
    value: {
      model: JARVIS_AI_MODEL,
      messages: messagesResult.messages,
      ...(toolsResult.tools.length === 0 ? {} : { tools: toolsResult.tools, parallel_tool_calls: false as const }),
      tool_choice: toolsResult.tools.length === 0 ? "none" : "auto",
      reasoning_effort: "none",
      max_completion_tokens: JARVIS_AI_MAX_OUTPUT_TOKENS,
      stream: false,
      store: false,
    },
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function authorizeJarvisAi(request: Request): boolean {
  const configured = (process.env.JARVIS_BRIDGE_TOKEN || process.env.UNAB_OS_BRIDGE_TOKEN)?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return Boolean(configured && configured.length >= 32 && supplied && constantTimeEqual(supplied, configured));
}

export function buildOpenAiChatCompletionsUrl(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !localHttp) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    const path = url.pathname.replace(/\/+$/, "");
    url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/chat/completions`;
    return url.toString();
  } catch {
    return null;
  }
}

export function isOpenAiChatCompletion(value: unknown): boolean {
  return isRecord(value) && value.object === "chat.completion" && Array.isArray(value.choices) && value.choices.length === 1;
}

export function safeUpstreamErrorMessage(value: unknown, status: number): string {
  const fallback = `The upstream AI service rejected the request with HTTP ${status}.`;
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.message !== "string") return fallback;
  const message = value.error.message.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 400);
  return message ? `The upstream AI service returned HTTP ${status}: ${message}` : fallback;
}
