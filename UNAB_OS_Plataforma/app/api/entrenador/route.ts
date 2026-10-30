import { runAgy } from "@/lib/ai/agy-bridge";
import { runCodexChat, CodexChatTurnError } from "@/lib/ai/codex-chat";
import { MAX_API_HISTORY_ENTRIES } from "@/lib/entrenador/limits";
import { buildEntrenadorPrompt, type EntrenadorHistoryTurn } from "@/lib/entrenador/prompt";
import { getInstitutionalUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

const MAX_MESSAGE_CHARACTERS = 4_000;
const MAX_HISTORY_CONTENT_CHARACTERS = 8_000;
const BRIDGE_UNAVAILABLE_REPLY =
  "El modelo local no está conectado en este momento. No voy a inventarte una respuesta: esperá un momento y volvé a intentar cuando el entrenador esté disponible.";
const CODEX_LIMIT_REPLY =
  "Se agotó la cuota de Codex de esta cuenta. No es un error del ejercicio: esperá a que se renueve la cuota (o ampliá el plan) y volvé a intentar. No voy a inventarte una respuesta.";
const CODEX_LIMIT_PATTERN = /usage limit|usageLimitExceeded|quota|rate limit/i;

type EntrenadorRequestBody = {
  message?: unknown;
  history?: unknown;
};

function errorResponse(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

function sanitizeHistory(value: unknown): EntrenadorHistoryTurn[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_API_HISTORY_ENTRIES) return null;

  const turns: EntrenadorHistoryTurn[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
    const record = entry as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "role" && key !== "content")) return null;
    const { role, content } = record;
    if (role !== "user" && role !== "entrenador") return null;
    if (typeof content !== "string") return null;
    if (content.length < 1 || content.length > MAX_HISTORY_CONTENT_CHARACTERS) return null;
    turns.push({ role, content });
  }
  return turns;
}

export async function POST(request: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return errorResponse("No se pudo leer la solicitud del entrenador.", 400);
  }
  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
    return errorResponse("La solicitud del entrenador no es válida.", 400);
  }

  const allowedKeys = new Set(["message", "history"]);
  if (Object.keys(parsedBody).some((key) => !allowedKeys.has(key))) {
    return errorResponse("La solicitud del entrenador contiene campos no permitidos.", 400);
  }
  const body = parsedBody as EntrenadorRequestBody;

  if (typeof body.message !== "string") return errorResponse("El mensaje no es válido.", 400);
  const message = body.message.trim();
  if (!message || message.length > MAX_MESSAGE_CHARACTERS) {
    return errorResponse("El mensaje no es válido.", 400);
  }

  const history = sanitizeHistory(body.history);
  if (history === null) return errorResponse("El historial de conversación no es válido.", 400);

  // Misma frontera de auth que las paginas: sesion institucional real O el
  // fallback de cookies (uninova_user_email / uninova_demo_session). En modo
  // invitado o con la sesion recordada NO hay usuario de Supabase, asi que
  // mirar solo `supabase.auth.getUser()` dejaria el chat en 401.
  // getInstitutionalUser() puede llamar redirect(), que en un route handler
  // lanza: por eso se atrapa y se trata como no autenticado.
  let authenticated = false;
  try {
    authenticated = Boolean(await getInstitutionalUser());
  } catch {
    authenticated = false;
  }
  if (!authenticated) return errorResponse("unauthorized", 401);

  const prompt = buildEntrenadorPrompt(history, message);

  try {
    // Provider chain: the local Antigravity CLI first (generous quota, plain
    // text, no handshake), then the local Codex app-server as a fallback.
    let reply: string;
    let provider: "antigravity" | "codex";
    try {
      reply = await runAgy({ prompt });
      provider = "antigravity";
    } catch {
      reply = await runCodexChat({ prompt });
      provider = "codex";
    }

    if (!reply.trim()) {
      return Response.json({ ok: false, error: "bridge_unavailable", reply: BRIDGE_UNAVAILABLE_REPLY }, { status: 503 });
    }
    return Response.json({ ok: true, reply, provider });
  } catch (error) {
    // Never echo upstream errors, stack traces, or filesystem paths to the client.
    // A failed turn (e.g. the account hit its Codex usage limit) gets its own
    // honest message so the student knows it is not their exercise.
    if (error instanceof CodexChatTurnError && CODEX_LIMIT_PATTERN.test(error.message)) {
      return Response.json({ ok: false, error: "codex_usage_limit", reply: CODEX_LIMIT_REPLY }, { status: 503 });
    }
    return Response.json({ ok: false, error: "bridge_unavailable", reply: BRIDGE_UNAVAILABLE_REPLY }, { status: 503 });
  }
}
