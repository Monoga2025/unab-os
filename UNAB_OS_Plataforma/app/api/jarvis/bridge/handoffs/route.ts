import { randomUUID } from "node:crypto";
import { buildJarvisStudyPrompt } from "@/lib/domain/jarvis";
import { authorizeJarvisBridge, resolveJarvisBridgeIdentity, unauthorized, unlinked } from "@/lib/jarvis/cloud-auth";
import { snapshotTemaFile, temaFileSnapshotSelect } from "@/lib/jarvis/cloud";
import { createAdminClient } from "@/lib/supabase/admin";

function label(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 180 ? value.trim() : null;
}

export async function POST(request: Request): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const candidateId = label(body?.candidateId);
  const title = label(body?.title);
  const subject = label(body?.subject);
  const topic = label(body?.topic);
  if (!candidateId || !/^[A-Za-z0-9_-]{1,128}$/.test(candidateId) || !title || !subject || !topic) {
    return Response.json({ error: "Invalid handoff input." }, { status: 400 });
  }
  const supabase = createAdminClient();
  let identity;
  try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
  catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500 }); }
  if (!identity) return unlinked();
  const { data: file, error: fileError } = await supabase.from("tema_files").select(temaFileSnapshotSelect)
    .eq("owner_id", identity.ownerId).eq("catalog_visible", true).eq("candidate_id", candidateId).single();
  if (fileError || !file || file.content_type !== "application/pdf" || Number(file.size_bytes) < 1 || Number(file.size_bytes) > 10_000_000) {
    return Response.json({ error: "Verified cloud document is unavailable for Telegram." }, { status: 404 });
  }
  const id = randomUUID();
  const { error } = await supabase.from("jarvis_study_handoffs").insert({
    id, owner_id: identity.ownerId, file_id: file.id, title, subject, topic,
    ...snapshotTemaFile(file as Record<string, unknown>),
    prompt: buildJarvisStudyPrompt({ handoffId: id, subject, topic }), status: "queued",
    telegram_link_id: identity.linkId,
    telegram_recipient_user_id: identity.linkId ? identity.telegramUserId : null,
    telegram_recipient_chat_id: identity.linkId ? identity.telegramChatId : null,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
