import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JARVIS_AI_MAX_OUTPUT_TOKENS,
  JARVIS_AI_MODEL,
  buildOpenAiChatCompletionsUrl,
  sanitizeJarvisAiRequest,
} from "@/lib/jarvis/ai-gateway";
import { POST } from "@/app/api/jarvis/ai/chat/completions/route";

const BRIDGE_TOKEN = "j".repeat(48);
const TOOL = {
  type: "function",
  function: {
    name: "crear_tarea",
    description: "Crea una tarea académica para el usuario.",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        materia: { type: ["string", "null"] },
        fecha: { type: ["string", "null"] },
      },
      required: ["titulo", "materia", "fecha"],
      additionalProperties: false,
    },
  },
};

const originalEnvironment = {
  bridgeToken: process.env.JARVIS_BRIDGE_TOKEN,
  openAiKey: process.env.OPENAI_API_KEY,
  openAiBaseUrl: process.env.OPENAI_BASE_URL,
};

function request(body: unknown, token = BRIDGE_TOKEN): Request {
  return new Request("http://localhost/api/jarvis/ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.sequential("Jarvis Netlify AI Gateway contract", () => {
  beforeEach(() => {
    process.env.JARVIS_BRIDGE_TOKEN = BRIDGE_TOKEN;
    process.env.OPENAI_API_KEY = "netlify-injected-test-key";
    process.env.OPENAI_BASE_URL = "https://gateway.netlify.test/openai";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnvironment.bridgeToken === undefined) delete process.env.JARVIS_BRIDGE_TOKEN;
    else process.env.JARVIS_BRIDGE_TOKEN = originalEnvironment.bridgeToken;
    if (originalEnvironment.openAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalEnvironment.openAiKey;
    if (originalEnvironment.openAiBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = originalEnvironment.openAiBaseUrl;
  });

  it("fixes model, output, reasoning, streaming, and tool parallelism on the server", () => {
    const result = sanitizeJarvisAiRequest({
      model: "client-selected-expensive-model",
      messages: [{ role: "system", content: "Orquesta." }, { role: "user", content: "Crea una tarea." }],
      tools: [TOOL],
      tool_choice: "required",
      max_tokens: 999_999,
      temperature: 2,
      stream: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      model: JARVIS_AI_MODEL,
      max_completion_tokens: JARVIS_AI_MAX_OUTPUT_TOKENS,
      reasoning_effort: "none",
      stream: false,
      store: false,
      tool_choice: "auto",
      parallel_tool_calls: false,
    });
    expect(result.value).not.toHaveProperty("max_tokens");
    expect(result.value).not.toHaveProperty("temperature");
    expect(result.value).not.toHaveProperty("base_url");
  });

  it("preserves the current Python function-call continuation shape", () => {
    const result = sanitizeJarvisAiRequest({
      model: "ignored",
      tools: [TOOL],
      messages: [
        { role: "system", content: "Orquesta." },
        { role: "user", content: "Crea una tarea." },
        {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "call_123",
            type: "function",
            function: {
              name: "crear_tarea",
              arguments: '{"titulo":"Repasar","materia":"Circuitos","fecha":"mañana 18:00"}',
            },
          }],
        },
        { role: "tool", tool_call_id: "call_123", content: '{"ok":true,"id":17}' },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.messages[2]).toMatchObject({
      role: "assistant",
      tool_calls: [{ id: "call_123", function: { name: "crear_tarea" } }],
    });
    expect(result.value.messages[3]).toEqual({
      role: "tool",
      tool_call_id: "call_123",
      content: '{"ok":true,"id":17}',
    });
  });

  it("rejects streaming, client endpoints, unknown tools, and unbounded history", () => {
    expect(sanitizeJarvisAiRequest({ messages: [{ role: "user", content: "hola" }], stream: true })).toMatchObject({ ok: false, param: "stream" });
    expect(sanitizeJarvisAiRequest({ messages: [{ role: "user", content: "hola" }], base_url: "https://attacker.test/v1" })).toMatchObject({ ok: false, param: "base_url" });
    expect(sanitizeJarvisAiRequest({
      messages: [{ role: "user", content: "hola" }],
      tools: [{ ...TOOL, function: { ...TOOL.function, name: "borrar_todo" } }],
    })).toMatchObject({ ok: false, param: "tools" });
    expect(sanitizeJarvisAiRequest({
      messages: Array.from({ length: 41 }, () => ({ role: "user", content: "hola" })),
    })).toMatchObject({ ok: false, param: "messages" });
  });

  it("builds only the server-configured OpenAI-compatible upstream path", () => {
    expect(buildOpenAiChatCompletionsUrl("https://gateway.test/openai")).toBe("https://gateway.test/openai/v1/chat/completions");
    expect(buildOpenAiChatCompletionsUrl("https://gateway.test/openai/v1")).toBe("https://gateway.test/openai/v1/chat/completions");
    expect(buildOpenAiChatCompletionsUrl("http://attacker.test/openai")).toBeNull();
  });

  it("proxies one non-streaming Chat Completion without exposing provider credentials", async () => {
    const completion = {
      id: "chatcmpl_test",
      object: "chat.completion",
      created: 1_787_655_600,
      model: "gpt-5.4-nano-2026-03-17",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Listo." } }],
      usage: { prompt_tokens: 20, completion_tokens: 3, total_tokens: 23 },
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(completion));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({
      model: "anything-the-client-wants",
      messages: [{ role: "system", content: "Orquesta." }, { role: "user", content: "¿Qué sigue?" }],
      max_tokens: 90_000,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(completion);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://gateway.netlify.test/openai/v1/chat/completions");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer netlify-injected-test-key",
    });
    const upstreamBody = JSON.parse(String(init.body));
    expect(upstreamBody.model).toBe(JARVIS_AI_MODEL);
    expect(upstreamBody.max_completion_tokens).toBe(JARVIS_AI_MAX_OUTPUT_TOKENS);
    expect(upstreamBody).not.toHaveProperty("max_tokens");
  });

  it("returns OpenAI-shaped authentication, provider, and timeout errors", async () => {
    const noFetch = vi.fn();
    vi.stubGlobal("fetch", noFetch);
    const unauthorized = await POST(request({ messages: [{ role: "user", content: "hola" }] }, "wrong-token"));
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toMatchObject({ error: { type: "authentication_error", code: "invalid_api_key" } });
    expect(noFetch).not.toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: { message: "AI credits exhausted" } },
      { status: 429 },
    )));
    const rejected = await POST(request({ messages: [{ role: "user", content: "hola" }] }));
    expect(rejected.status).toBe(429);
    expect(await rejected.json()).toMatchObject({
      error: { type: "api_error", code: "upstream_http_429", message: expect.stringContaining("AI credits exhausted") },
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    const timedOut = await POST(request({ messages: [{ role: "user", content: "hola" }] }));
    expect(timedOut.status).toBe(504);
    expect(await timedOut.json()).toMatchObject({ error: { type: "timeout_error", code: "upstream_timeout" } });
  });
});
