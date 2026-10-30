import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasTelegramIdentityHeaders,
  normalizeTelegramId,
  telegramRecipientFromRequest,
  type TelegramRecipient,
} from "@/lib/telegram/pairing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JarvisBridgeAuthorization = Readonly<{
  legacyOwnerId: string | null;
  legacyRecipient: TelegramRecipient | null;
}>;

export type JarvisBridgeIdentity = TelegramRecipient & Readonly<{
  ownerId: string;
  linkId: string | null;
  legacy: boolean;
}>;

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function legacyAuthorization(): Pick<JarvisBridgeAuthorization, "legacyOwnerId" | "legacyRecipient"> {
  const rawOwner = (process.env.JARVIS_BRIDGE_OWNER_ID || process.env.UNAB_OS_OWNER_ID)?.trim();
  const legacyOwnerId = rawOwner && UUID.test(rawOwner) ? rawOwner.toLowerCase() : null;
  const telegramUserId = normalizeTelegramId(
    process.env.JARVIS_BRIDGE_LEGACY_TELEGRAM_USER_ID || process.env.TELEGRAM_ALLOWED_USER_ID,
  );
  return {
    legacyOwnerId,
    legacyRecipient: telegramUserId
      ? { telegramUserId, telegramChatId: telegramUserId }
      : null,
  };
}

export function authorizeJarvisBridge(request: Request): JarvisBridgeAuthorization | null {
  const configuredToken = (process.env.JARVIS_BRIDGE_TOKEN || process.env.UNAB_OS_BRIDGE_TOKEN)?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!configuredToken || configuredToken.length < 32 || !supplied) return null;
  if (!constantTimeEqual(supplied, configuredToken)) return null;
  return legacyAuthorization();
}

export async function resolveJarvisBridgeIdentity(
  request: Request,
  supabase: SupabaseClient,
  authorization = authorizeJarvisBridge(request),
): Promise<JarvisBridgeIdentity | null> {
  if (!authorization) return null;
  const recipient = telegramRecipientFromRequest(request);
  if (!recipient) return null;
  const { data, error } = await supabase.from("telegram_links")
    .select("id,owner_id,telegram_user_id,telegram_chat_id")
    .eq("telegram_user_id", recipient.telegramUserId)
    .eq("telegram_chat_id", recipient.telegramChatId)
    .is("unlinked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Telegram identity lookup failed: ${error.message}`);
  if (data) {
    return {
      ownerId: String(data.owner_id),
      linkId: String(data.id),
      telegramUserId: String(data.telegram_user_id),
      telegramChatId: String(data.telegram_chat_id),
      legacy: false,
    };
  }
  if (
    authorization.legacyOwnerId
    && authorization.legacyRecipient?.telegramUserId === recipient.telegramUserId
    && authorization.legacyRecipient.telegramChatId === recipient.telegramChatId
  ) {
    const { data: historical, error: historyError } = await supabase.from("telegram_links")
      .select("id")
      .or(`owner_id.eq.${authorization.legacyOwnerId},telegram_user_id.eq.${recipient.telegramUserId}`)
      .limit(1);
    if (historyError) throw new Error(`Telegram legacy history lookup failed: ${historyError.message}`);
    if ((historical ?? []).length > 0) return null;
    return {
      ownerId: authorization.legacyOwnerId,
      linkId: null,
      ...recipient,
      legacy: true,
    };
  }
  return null;
}

export function requestHasInvalidTelegramIdentity(request: Request): boolean {
  return hasTelegramIdentityHeaders(request) && !telegramRecipientFromRequest(request);
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export function unlinked(): Response {
  return Response.json({ error: "Telegram account is not linked." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
