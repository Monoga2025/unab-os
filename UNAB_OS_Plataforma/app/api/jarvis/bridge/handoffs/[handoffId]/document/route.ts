import { createHash, timingSafeEqual } from "node:crypto";
import {
  authorizeJarvisBridge,
  resolveJarvisBridgeIdentity,
  unauthorized,
  unlinked,
} from "@/lib/jarvis/cloud-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type BridgeIdentity = NonNullable<Awaited<ReturnType<typeof resolveJarvisBridgeIdentity>>>;

async function failPermanentDocument(
  supabase: ReturnType<typeof createAdminClient>,
  identity: BridgeIdentity,
  handoffId: string,
): Promise<Response> {
  const now = new Date().toISOString();
  let query = supabase.from("jarvis_study_handoffs").update({
    status: "failed",
    failure_reason: "El documento privado ya no está disponible para entrega.",
    updated_at: now,
  }).eq("owner_id", identity.ownerId).eq("id", handoffId).eq("status", "processing");
  query = identity.legacy
    ? query.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : query.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { error } = await query;
  return error
    ? Response.json({ error: "Document cleanup failed.", code: "HANDOFF_CLEANUP_FAILED" }, { status: 500 })
    : Response.json({ error: "Handoff document is unavailable.", code: "HANDOFF_DOCUMENT_INVALID" }, { status: 409 });
}

function storageStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = (error as { statusCode?: unknown; status?: unknown }).statusCode
    ?? (error as { status?: unknown }).status;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ handoffId: string }> }): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  const { handoffId } = await params;
  const supabase = createAdminClient();
  let identity;
  try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
  catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500 }); }
  if (!identity) return unlinked();
  let query = supabase.from("jarvis_study_handoffs")
    .select("status,document_storage_bucket,document_storage_object_name,document_file_name,document_content_type,document_size_bytes,document_sha256")
    .eq("owner_id", identity.ownerId).eq("id", handoffId)
    .in("status", ["processing", "delivered", "reviewed"]);
  query = identity.legacy
    ? query.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : query.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { data: row, error } = await query.maybeSingle();
  if (error) return Response.json({ error: "Document lookup failed." }, { status: 500 });
  if (!row) return new Response("Not found.", { status: 404 });
  if (
    row.document_content_type !== "application/pdf"
    || Number(row.document_size_bytes) < 1
    || Number(row.document_size_bytes) > 10_000_000
    || typeof row.document_sha256 !== "string"
    || !/^[0-9a-f]{64}$/.test(row.document_sha256)
  ) return failPermanentDocument(supabase, identity, handoffId);
  const { data: blob, error: downloadError } = await supabase.storage
    .from(String(row.document_storage_bucket))
    .download(String(row.document_storage_object_name));
  if (downloadError) {
    return [400, 404].includes(storageStatus(downloadError) ?? 0)
      ? failPermanentDocument(supabase, identity, handoffId)
      : Response.json({ error: "Document storage is temporarily unavailable." }, { status: 503 });
  }
  if (!blob) return Response.json({ error: "Document storage is temporarily unavailable." }, { status: 503 });
  if (blob.size !== Number(row.document_size_bytes)) return failPermanentDocument(supabase, identity, handoffId);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const actualDigest = Buffer.from(createHash("sha256").update(bytes).digest("hex"), "hex");
  const expectedDigest = Buffer.from(row.document_sha256, "hex");
  if (actualDigest.length !== expectedDigest.length || !timingSafeEqual(actualDigest, expectedDigest)) {
    return failPermanentDocument(supabase, identity, handoffId);
  }
  return new Response(bytes, { headers: {
    "Cache-Control": "private, no-store",
    "Content-Type": String(row.document_content_type),
    "Content-Length": String(bytes.byteLength),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(String(row.document_file_name))}`,
    "X-Content-Type-Options": "nosniff",
  } });
}
