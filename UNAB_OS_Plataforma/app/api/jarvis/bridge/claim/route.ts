import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authorizeJarvisBridge,
  requestHasInvalidTelegramIdentity,
  resolveJarvisBridgeIdentity,
  unauthorized,
  unlinked,
  type JarvisBridgeAuthorization,
  type JarvisBridgeIdentity,
} from "@/lib/jarvis/cloud-auth";
import { toHandoff } from "@/lib/jarvis/cloud";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelegramRecipient } from "@/lib/telegram/pairing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT = "id,owner_id,title,subject,topic,prompt,status,processing_started_at,created_at,telegram_link_id,telegram_recipient_user_id,telegram_recipient_chat_id,tema_course_id,document_storage_bucket,document_storage_object_name,document_file_name,document_content_type,document_size_bytes,document_sha256";
const NO_STORE = { "Cache-Control": "no-store" };

type HandoffRow = Record<string, unknown>;

function targetPayload(recipient: TelegramRecipient) {
  return {
    telegramUserId: recipient.telegramUserId,
    telegramChatId: recipient.telegramChatId,
  };
}

function rowMatchesIdentity(row: HandoffRow, identity: JarvisBridgeIdentity): boolean {
  if (String(row.owner_id) !== identity.ownerId) return false;
  if (identity.legacy) {
    return row.telegram_link_id == null
      && row.telegram_recipient_user_id == null
      && row.telegram_recipient_chat_id == null;
  }
  return String(row.telegram_link_id) === identity.linkId
    && String(row.telegram_recipient_user_id) === identity.telegramUserId
    && String(row.telegram_recipient_chat_id) === identity.telegramChatId;
}

async function verifiedRecipient(
  supabase: SupabaseClient,
  row: HandoffRow,
  authorization: JarvisBridgeAuthorization,
): Promise<TelegramRecipient | null> {
  if (row.telegram_link_id == null) {
    if (authorization.legacyOwnerId !== String(row.owner_id) || !authorization.legacyRecipient) return null;
    const { data, error } = await supabase.from("telegram_links").select("id")
      .or(`owner_id.eq.${authorization.legacyOwnerId},telegram_user_id.eq.${authorization.legacyRecipient.telegramUserId}`)
      .limit(1);
    if (error) throw new Error(`Telegram legacy history lookup failed: ${error.message}`);
    return (data ?? []).length ? null : authorization.legacyRecipient;
  }
  const telegramUserId = String(row.telegram_recipient_user_id ?? "");
  const telegramChatId = String(row.telegram_recipient_chat_id ?? "");
  const { data, error } = await supabase.from("telegram_links")
    .select("id")
    .eq("id", String(row.telegram_link_id))
    .eq("owner_id", String(row.owner_id))
    .eq("telegram_user_id", telegramUserId)
    .eq("telegram_chat_id", telegramChatId)
    .is("unlinked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Telegram target verification failed: ${error.message}`);
  return data ? { telegramUserId, telegramChatId } : null;
}

async function failInvalidHandoff(supabase: SupabaseClient, row: HandoffRow): Promise<void> {
  const { error } = await supabase.from("jarvis_study_handoffs").update({
    status: "failed",
    failure_reason: "El documento relacionado no está disponible para entrega.",
    updated_at: new Date().toISOString(),
  }).eq("id", String(row.id)).eq("owner_id", String(row.owner_id)).in("status", ["queued", "processing"]);
  if (error) throw new Error(`Handoff cleanup failed: ${error.message}`);
}

async function invalidHandoffResponse(supabase: SupabaseClient, row: HandoffRow): Promise<Response> {
  try {
    await failInvalidHandoff(supabase, row);
  } catch {
    return Response.json({ error: "Handoff validation cleanup failed.", code: "HANDOFF_CLEANUP_FAILED" }, { status: 500, headers: NO_STORE });
  }
  return Response.json({ error: "Handoff document is unavailable.", code: "HANDOFF_DOCUMENT_INVALID" }, { status: 409, headers: NO_STORE });
}

function parseHandoff(row: HandoffRow) {
  try { return toHandoff(row); }
  catch { return null; }
}

async function exactRow(
  supabase: SupabaseClient,
  handoffId: string,
  identity: JarvisBridgeIdentity,
): Promise<{ row: HandoffRow | null; error: string | null }> {
  let query = supabase.from("jarvis_study_handoffs").select(SELECT)
    .eq("owner_id", identity.ownerId).eq("id", handoffId)
    .in("status", ["queued", "processing", "delivered", "reviewed"]);
  query = identity.legacy
    ? query.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : query.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { data, error } = await query.maybeSingle();
  return { row: data as HandoffRow | null, error: error?.message ?? null };
}

async function globalRows(
  supabase: SupabaseClient,
  status: "processing" | "queued",
  authorization: JarvisBridgeAuthorization,
): Promise<{ rows: HandoffRow[]; error: string | null }> {
  const explicit = await supabase.from("jarvis_study_handoffs").select(SELECT)
    .eq("status", status).not("telegram_link_id", "is", null)
    .order(status === "processing" ? "processing_started_at" : "created_at")
    .limit(20);
  if (explicit.error) return { rows: [], error: explicit.error.message };
  let legacyRows: HandoffRow[] = [];
  if (authorization.legacyOwnerId && authorization.legacyRecipient) {
    const legacy = await supabase.from("jarvis_study_handoffs").select(SELECT)
      .eq("owner_id", authorization.legacyOwnerId).eq("status", status)
      .is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
      .order(status === "processing" ? "processing_started_at" : "created_at")
      .limit(20);
    if (legacy.error) return { rows: [], error: legacy.error.message };
    legacyRows = (legacy.data ?? []) as HandoffRow[];
  }
  return { rows: [...((explicit.data ?? []) as HandoffRow[]), ...legacyRows], error: null };
}

export async function POST(request: Request): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  if (requestHasInvalidTelegramIdentity(request)) {
    return Response.json({ error: "Invalid Telegram identity." }, { status: 400, headers: NO_STORE });
  }
  const body = await request.json().catch(() => ({})) as { handoffId?: unknown };
  const handoffId = typeof body.handoffId === "string" && UUID.test(body.handoffId) ? body.handoffId.toLowerCase() : null;
  const supabase = createAdminClient();
  const requestHasIdentity = request.headers.has("x-telegram-user-id") || request.headers.has("x-telegram-chat-id");
  let identity: JarvisBridgeIdentity | null = null;
  if (requestHasIdentity) {
    try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
    catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500, headers: NO_STORE }); }
    if (!identity) return unlinked();
  }

  if (handoffId) {
    if (!identity) return Response.json({ error: "Telegram identity is required for an exact claim." }, { status: 400, headers: NO_STORE });
    const loaded = await exactRow(supabase, handoffId, identity);
    if (loaded.error) return Response.json({ error: loaded.error }, { status: 500, headers: NO_STORE });
    if (!loaded.row || !rowMatchesIdentity(loaded.row, identity)) return new Response(null, { status: 204 });
    const handoff = parseHandoff(loaded.row);
    if (!handoff) {
      return invalidHandoffResponse(supabase, loaded.row);
    }
    if (loaded.row.status === "queued") {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("jarvis_study_handoffs").update({
        status: "processing", processing_started_at: now, updated_at: now,
      }).eq("id", handoffId).eq("owner_id", identity.ownerId).eq("status", "queued").select("id").maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
      if (!data) return new Response(null, { status: 409 });
    }
    return Response.json({
      handoff,
      replay: ["delivered", "reviewed"].includes(String(loaded.row.status)),
      recipient: targetPayload(identity),
    }, { headers: NO_STORE });
  }

  if (identity) {
    for (const status of ["processing", "queued"] as const) {
      let query = supabase.from("jarvis_study_handoffs").select(SELECT)
        .eq("owner_id", identity.ownerId).eq("status", status);
      query = identity.legacy
        ? query.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
        : query.eq("telegram_link_id", identity.linkId)
          .eq("telegram_recipient_user_id", identity.telegramUserId)
          .eq("telegram_recipient_chat_id", identity.telegramChatId);
      const { data, error } = await query.order(status === "processing" ? "processing_started_at" : "created_at").limit(1).maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
      if (!data) continue;
      const row = data as HandoffRow;
      const handoff = parseHandoff(row);
      if (!handoff) {
        return invalidHandoffResponse(supabase, row);
      }
      if (status === "queued") {
        const now = new Date().toISOString();
        const { data: claimed, error: claimError } = await supabase.from("jarvis_study_handoffs").update({
          status: "processing", processing_started_at: now, updated_at: now,
        }).eq("id", String(row.id)).eq("owner_id", identity.ownerId).eq("status", "queued").select("id").maybeSingle();
        if (claimError) return Response.json({ error: claimError.message }, { status: 500, headers: NO_STORE });
        if (!claimed) return new Response(null, { status: 409 });
      }
      return Response.json({ handoff, replay: false, recipient: targetPayload(identity) }, { headers: NO_STORE });
    }
    return new Response(null, { status: 204 });
  }

  let invalidSeen = false;
  for (const status of ["processing", "queued"] as const) {
    const loaded = await globalRows(supabase, status, authorization);
    if (loaded.error) return Response.json({ error: loaded.error }, { status: 500, headers: NO_STORE });
    for (const row of loaded.rows) {
      let recipient: TelegramRecipient | null;
      try { recipient = await verifiedRecipient(supabase, row, authorization); }
      catch {
        return Response.json({ error: "Telegram target verification failed." }, { status: 500, headers: NO_STORE });
      }
      const handoff = recipient ? parseHandoff(row) : null;
      if (!recipient || !handoff) {
        invalidSeen = true;
        try { await failInvalidHandoff(supabase, row); }
        catch {
          return Response.json({ error: "Handoff validation cleanup failed.", code: "HANDOFF_CLEANUP_FAILED" }, { status: 500, headers: NO_STORE });
        }
        continue;
      }
      if (status === "queued") {
        const now = new Date().toISOString();
        const { data: claimed, error } = await supabase.from("jarvis_study_handoffs").update({
          status: "processing", processing_started_at: now, updated_at: now,
        }).eq("id", String(row.id)).eq("owner_id", String(row.owner_id)).eq("status", "queued").select("id").maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500, headers: NO_STORE });
        if (!claimed) continue;
      }
      return Response.json({ handoff, replay: false, recipient: targetPayload(recipient) }, { headers: NO_STORE });
    }
  }
  return invalidSeen
    ? Response.json({ error: "One or more handoffs had no valid document or destination.", code: "HANDOFF_INVALID" }, { status: 409, headers: NO_STORE })
    : new Response(null, { status: 204 });
}
