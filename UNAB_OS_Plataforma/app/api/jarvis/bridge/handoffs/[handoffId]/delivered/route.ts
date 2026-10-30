import {
  authorizeJarvisBridge,
  resolveJarvisBridgeIdentity,
  unauthorized,
  unlinked,
} from "@/lib/jarvis/cloud-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ handoffId: string }> }): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  const { handoffId } = await params;
  const supabase = createAdminClient();
  let identity;
  try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
  catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500 }); }
  if (!identity) return unlinked();
  let readQuery = supabase.from("jarvis_study_handoffs").select("status")
    .eq("owner_id", identity.ownerId).eq("id", handoffId);
  readQuery = identity.legacy
    ? readQuery.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : readQuery.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { data: existing, error: readError } = await readQuery.maybeSingle();
  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  if (!existing) return new Response(null, { status: 404 });
  if (["delivered", "reviewed"].includes(existing.status)) return new Response(null, { status: 204 });
  const now = new Date().toISOString();
  let updateQuery = supabase.from("jarvis_study_handoffs")
    .update({ status: "delivered", delivered_at: now, updated_at: now })
    .eq("owner_id", identity.ownerId).eq("id", handoffId).eq("status", "processing");
  updateQuery = identity.legacy
    ? updateQuery.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : updateQuery.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { data, error } = await updateQuery.select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: data ? 204 : 409 });
}
