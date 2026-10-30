import { authorizeJarvisBridge, resolveJarvisBridgeIdentity, unauthorized, unlinked } from "@/lib/jarvis/cloud-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request): Promise<Response> {
  const authorization = authorizeJarvisBridge(request);
  if (!authorization) return unauthorized();
  const supabase = createAdminClient();
  let identity;
  try { identity = await resolveJarvisBridgeIdentity(request, supabase, authorization); }
  catch { return Response.json({ error: "Telegram identity lookup failed." }, { status: 500 }); }
  if (!identity) return unlinked();
  const [coursesResult, sectionsResult, filesResult, syncResult] = await Promise.all([
    supabase.from("tema_courses").select("id,name,active_state").eq("owner_id", identity.ownerId).eq("catalog_visible", true),
    supabase.from("tema_sections").select("id,title").eq("owner_id", identity.ownerId).eq("catalog_visible", true),
    supabase.from("tema_files").select("candidate_id,course_id,section_id,activity_name,file_name,content_type,size_bytes")
      .eq("owner_id", identity.ownerId).eq("catalog_visible", true).eq("content_type", "application/pdf").lte("size_bytes", 10_000_000),
    supabase.from("tema_sync_runs").select("status,finished_at,captured_at")
      .eq("owner_id", identity.ownerId).neq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [coursesResult, sectionsResult, filesResult]) {
    if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  }
  const courses = new Map((coursesResult.data ?? []).map((row) => [row.id, { name: row.name, activeState: row.active_state }]));
  const sections = new Map((sectionsResult.data ?? []).map((row) => [row.id, row.title]));
  const materials = (filesResult.data ?? []).map((file) => ({
    candidateId: file.candidate_id,
    course: courses.get(file.course_id)?.name ?? "Materia",
    activeState: courses.get(file.course_id)?.activeState ?? "unknown",
    section: sections.get(file.section_id) ?? "Sección",
    title: file.activity_name,
    fileName: file.file_name,
    mimeType: file.content_type,
    bytes: Number(file.size_bytes),
  }));
  return Response.json({
    materials,
    sync: syncResult.error || !syncResult.data ? null : {
      status: syncResult.data.status,
      finishedAt: syncResult.data.finished_at,
      capturedAt: syncResult.data.captured_at,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
