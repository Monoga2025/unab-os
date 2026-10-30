import { jarvisReportEnvelopeSchema } from "@/lib/domain/jarvis";
import {
  authorizeJarvisBridge,
  resolveJarvisBridgeIdentity,
  unauthorized,
  unlinked,
} from "@/lib/jarvis/cloud-auth";
import { validateCloudReport } from "@/lib/jarvis/cloud";
import { createAdminClient } from "@/lib/supabase/admin";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function POST(request: Request): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  let report;
  try { report = validateCloudReport(await request.json()); }
  catch { return Response.json({ error: "Invalid report contract." }, { status: 400 }); }
  const supabase = createAdminClient();
  let identity;
  try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
  catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500 }); }
  if (!identity) return unlinked();
  let handoffQuery = supabase.from("jarvis_study_handoffs").select("status")
    .eq("owner_id", identity.ownerId).eq("id", report.handoffId);
  handoffQuery = identity.legacy
    ? handoffQuery.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : handoffQuery.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { data: handoff, error: handoffError } = await handoffQuery.maybeSingle();
  if (handoffError) return Response.json({ error: handoffError.message }, { status: 500 });
  if (!handoff || !["delivered", "reviewed"].includes(handoff.status)) {
    return Response.json({ error: "Handoff was not delivered to this Telegram account." }, { status: 409 });
  }
  const receivedAt = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase.from("jarvis_study_reports").select("report,received_at")
    .eq("owner_id", identity.ownerId).eq("handoff_id", report.handoffId).maybeSingle();
  if (existingError) return Response.json({ error: existingError.message }, { status: 500 });
  if (existing) {
    if (canonicalJson(existing.report) !== canonicalJson(report)) return Response.json({ error: "A different report already exists." }, { status: 409 });
    const retryAt = new Date().toISOString();
    let retryQuery = supabase.from("jarvis_study_handoffs").update({ status: "reviewed", updated_at: retryAt })
      .eq("owner_id", identity.ownerId).eq("id", report.handoffId).eq("status", "delivered");
    retryQuery = identity.legacy
      ? retryQuery.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
      : retryQuery.eq("telegram_link_id", identity.linkId)
        .eq("telegram_recipient_user_id", identity.telegramUserId)
        .eq("telegram_recipient_chat_id", identity.telegramChatId);
    const { error: retryError } = await retryQuery;
    if (retryError) return Response.json({ error: retryError.message }, { status: 500 });
    return Response.json({ schemaVersion: jarvisReportEnvelopeSchema, ownerId: identity.ownerId, receivedAt: existing.received_at, report, created: false });
  }
  const { error: insertError } = await supabase.from("jarvis_study_reports").insert({
    owner_id: identity.ownerId, handoff_id: report.handoffId, report, received_at: receivedAt,
  });
  if (insertError) return Response.json({ error: insertError.message }, { status: insertError.code === "23505" ? 409 : 500 });
  let updateQuery = supabase.from("jarvis_study_handoffs").update({ status: "reviewed", updated_at: receivedAt })
    .eq("owner_id", identity.ownerId).eq("id", report.handoffId).eq("status", "delivered");
  updateQuery = identity.legacy
    ? updateQuery.is("telegram_link_id", null).is("telegram_recipient_user_id", null).is("telegram_recipient_chat_id", null)
    : updateQuery.eq("telegram_link_id", identity.linkId)
      .eq("telegram_recipient_user_id", identity.telegramUserId)
      .eq("telegram_recipient_chat_id", identity.telegramChatId);
  const { error: updateError } = await updateQuery;
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ schemaVersion: jarvisReportEnvelopeSchema, ownerId: identity.ownerId, receivedAt, report, created: true }, { status: 201 });
}
