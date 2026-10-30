import { authorizeJarvisBridge, unauthorized } from "@/lib/jarvis/cloud-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashTelegramLinkCode,
  normalizeTelegramLinkCode,
  telegramRecipientFromRequest,
} from "@/lib/telegram/pairing";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  if (!authorizeJarvisBridge(request)) return unauthorized();
  const recipient = telegramRecipientFromRequest(request);
  if (!recipient) {
    return Response.json({ error: "Pairing is only available in a private Telegram chat." }, { status: 400, headers: NO_STORE });
  }
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = normalizeTelegramLinkCode(body?.code);
  if (!code) {
    return Response.json({ error: "Invalid, expired or already used pairing code." }, { status: 400, headers: NO_STORE });
  }
  try {
    const { data, error } = await createAdminClient().rpc("consume_telegram_link_code", {
      p_code_hash: hashTelegramLinkCode(code),
      p_telegram_user_id: recipient.telegramUserId,
      p_telegram_chat_id: recipient.telegramChatId,
    });
    const linked = Array.isArray(data) ? data[0] : null;
    if (error) {
      return Response.json({ error: "Pairing service is temporarily unavailable." }, { status: 500, headers: NO_STORE });
    }
    if (!linked) {
      return Response.json({ error: "Invalid, expired or already used pairing code." }, { status: 400, headers: NO_STORE });
    }
    return Response.json({ linked: true }, { status: 201, headers: NO_STORE });
  } catch {
    return Response.json({ error: "Pairing could not be completed." }, { status: 500, headers: NO_STORE });
  }
}
