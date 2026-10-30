import {
  JARVIS_AI_MAX_REQUEST_BYTES,
  JARVIS_AI_MAX_RESPONSE_BYTES,
  JARVIS_AI_TIMEOUT_MS,
  authorizeJarvisAi,
  buildOpenAiChatCompletionsUrl,
  isOpenAiChatCompletion,
  safeUpstreamErrorMessage,
  sanitizeJarvisAiRequest,
} from "@/lib/jarvis/ai-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function openAiError(
  message: string,
  status: number,
  code: string,
  param: string | null = null,
  type = "invalid_request_error",
): Response {
  return Response.json(
    { error: { message, type, param, code } },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export async function POST(request: Request): Promise<Response> {
  if (!authorizeJarvisAi(request)) {
    return openAiError("Invalid Jarvis bridge token.", 401, "invalid_api_key", null, "authentication_error");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return openAiError("Content-Type must be application/json.", 415, "unsupported_media_type");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > JARVIS_AI_MAX_REQUEST_BYTES) {
    return openAiError("The request body is too large.", 413, "request_too_large");
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > JARVIS_AI_MAX_REQUEST_BYTES) {
    return openAiError("The request body is too large.", 413, "request_too_large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return openAiError("The request body is not valid JSON.", 400, "invalid_json");
  }
  const validated = sanitizeJarvisAiRequest(parsed);
  if (!validated.ok) {
    return openAiError(validated.message, validated.status, validated.code, validated.param);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const upstreamUrl = buildOpenAiChatCompletionsUrl(process.env.OPENAI_BASE_URL?.trim() ?? "");
  if (!apiKey || !upstreamUrl) {
    return openAiError(
      "Netlify AI Gateway is not configured: OPENAI_API_KEY or OPENAI_BASE_URL is unavailable.",
      503,
      "ai_gateway_not_configured",
      null,
      "service_unavailable_error",
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(validated.value),
      signal: AbortSignal.timeout(JARVIS_AI_TIMEOUT_MS),
      cache: "no-store",
    });
    const upstreamBody = await upstream.text();
    if (Buffer.byteLength(upstreamBody, "utf8") > JARVIS_AI_MAX_RESPONSE_BYTES) {
      return openAiError("The upstream AI response exceeded the gateway limit.", 502, "upstream_response_too_large", null, "api_error");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(upstreamBody);
    } catch {
      return openAiError("The upstream AI service returned a non-JSON response.", 502, "invalid_upstream_response", null, "api_error");
    }
    if (!upstream.ok) {
      const status = upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502;
      return openAiError(safeUpstreamErrorMessage(payload, upstream.status), status, `upstream_http_${upstream.status}`, null, "api_error");
    }
    if (!isOpenAiChatCompletion(payload)) {
      return openAiError("The upstream AI service returned an invalid chat completion.", 502, "invalid_upstream_response", null, "api_error");
    }
    return Response.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (isTimeout(error)) {
      return openAiError(`The upstream AI service timed out after ${JARVIS_AI_TIMEOUT_MS / 1_000} seconds.`, 504, "upstream_timeout", null, "timeout_error");
    }
    console.error("Jarvis AI Gateway request failed", error instanceof Error ? { name: error.name, message: error.message } : "unknown error");
    return openAiError("The upstream AI service could not be reached.", 502, "upstream_unavailable", null, "api_connection_error");
  }
}
