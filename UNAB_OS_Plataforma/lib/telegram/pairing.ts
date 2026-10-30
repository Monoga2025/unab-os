import "server-only";

import { createHmac, randomBytes } from "node:crypto";

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 12;
const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const TELEGRAM_ID_PATTERN = /^[1-9][0-9]{0,18}$/;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

export type TelegramRecipient = Readonly<{
  telegramUserId: string;
  telegramChatId: string;
}>;

function pairingSecret(): string {
  const secret = (process.env.TELEGRAM_LINK_CODE_SECRET || process.env.JARVIS_BRIDGE_TOKEN || process.env.UNAB_OS_BRIDGE_TOKEN)?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Missing server-only Telegram pairing secret.");
  }
  return secret;
}

export function generateTelegramLinkCode(): string {
  let value = BigInt(`0x${randomBytes(8).toString("hex")}`);
  const characters = Array<string>(CODE_LENGTH);
  for (let index = CODE_LENGTH - 1; index >= 0; index -= 1) {
    characters[index] = CODE_ALPHABET[Number(value & 31n)];
    value >>= 5n;
  }
  return characters.join("");
}

export function normalizeTelegramLinkCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(normalized) ? normalized : null;
}

export function displayTelegramLinkCode(code: string): string {
  const normalized = normalizeTelegramLinkCode(code);
  if (!normalized) throw new Error("Invalid Telegram link code.");
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8)}`;
}

export function hashTelegramLinkCode(code: string): string {
  const normalized = normalizeTelegramLinkCode(code);
  if (!normalized) throw new Error("Invalid Telegram link code.");
  return createHmac("sha256", pairingSecret())
    .update(`unab-os.telegram-link.v1:${normalized}`, "utf8")
    .digest("hex");
}

export function normalizeTelegramId(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
  if (!TELEGRAM_ID_PATTERN.test(text)) return null;
  try {
    return BigInt(text) <= MAX_POSTGRES_BIGINT ? text : null;
  } catch {
    return null;
  }
}

export function telegramRecipientFromRequest(request: Request): TelegramRecipient | null {
  const telegramUserId = normalizeTelegramId(request.headers.get("x-telegram-user-id"));
  const telegramChatId = normalizeTelegramId(request.headers.get("x-telegram-chat-id"));
  if (!telegramUserId || !telegramChatId || telegramUserId !== telegramChatId) return null;
  return { telegramUserId, telegramChatId };
}

export function hasTelegramIdentityHeaders(request: Request): boolean {
  return request.headers.has("x-telegram-user-id") || request.headers.has("x-telegram-chat-id");
}
