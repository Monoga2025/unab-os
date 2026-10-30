import { StudyWorkspace } from "@/components/study-workspace";
import { UniNovaBernoulliCard } from "@/components/uninova/uninova-bernoulli-card";
import { requireUser } from "@/lib/supabase/auth";
import type { StudyDocumentKind, StudySessionStatus } from "@/lib/domain/study";

export default async function StudyPage() {
  const { supabase, userId } = await requireUser();
  const [documentsResult, sessionsResult] = await Promise.all([
    supabase
      .from("study_documents")
      .select("id, kind, status, file_name, mime_type, size_bytes, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("study_sessions")
      .select("id, title, status, planned_for, target_minutes, started_at, tema_course_id")
      .eq("user_id", userId)
      .order("planned_for", { ascending: false })
      .limit(20),
  ]);

  if (documentsResult.error) console.warn("documentsResult error:", documentsResult.error);
  if (sessionsResult.error) console.warn("sessionsResult error:", sessionsResult.error);

  const documents = documentsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const [linksResult, temaLinksResult, handoffsResult] = sessionIds.length
    ? await Promise.all([
      supabase.from("study_session_documents").select("session_id,document_id").eq("user_id", userId).in("session_id", sessionIds),
      supabase.from("study_session_tema_files").select("session_id,file_id").eq("user_id", userId).in("session_id", sessionIds),
      supabase.from("jarvis_study_handoffs").select("study_session_id,status,created_at")
        .eq("owner_id", userId).in("study_session_id", sessionIds).order("created_at", { ascending: false }),
    ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (linksResult.error) console.warn("linksResult error:", linksResult.error);
  if (temaLinksResult.error) console.warn("temaLinksResult error:", temaLinksResult.error);
  if (handoffsResult.error) console.warn("handoffsResult error:", handoffsResult.error);

  const temaFileIds = [...new Set((temaLinksResult.data ?? []).map((link) => link.file_id))];
  const courseIds = [...new Set(sessions.map((session) => session.tema_course_id).filter((id): id is string => typeof id === "string"))];
  const [temaFilesResult, coursesResult] = await Promise.all([
    temaFileIds.length
      ? supabase.from("tema_files").select("id,candidate_id,file_name").eq("owner_id", userId).in("id", temaFileIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from("tema_courses").select("id,name").eq("owner_id", userId).in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (temaFilesResult.error) console.warn("temaFilesResult error:", temaFilesResult.error);
  if (coursesResult.error) console.warn("coursesResult error:", coursesResult.error);

  const fileNameById = new Map(documents.map((document) => [document.id, document.file_name]));
  const namesBySession = new Map<string, string[]>();
  for (const link of linksResult.data ?? []) {
    const fileName = fileNameById.get(link.document_id);
    if (!fileName) continue;
    namesBySession.set(link.session_id, [...(namesBySession.get(link.session_id) ?? []), fileName]);
  }
  const temaFileById = new Map((temaFilesResult.data ?? []).map((file) => [file.id, file]));
  const temaResourcesBySession = new Map<string, { fileName: string; href: string }[]>();
  for (const link of temaLinksResult.data ?? []) {
    const file = temaFileById.get(link.file_id);
    if (!file) continue;
    temaResourcesBySession.set(link.session_id, [...(temaResourcesBySession.get(link.session_id) ?? []), {
      fileName: file.file_name,
      href: `/api/tema/files/${encodeURIComponent(file.candidate_id)}`,
    }]);
  }
  const validHandoffStatuses = new Set(["queued", "processing", "delivered", "reviewed", "failed"] as const);
  type HandoffStatus = "queued" | "processing" | "delivered" | "reviewed" | "failed";
  const handoffStatusBySession = new Map<string, HandoffStatus>();
  for (const handoff of handoffsResult.data ?? []) {
    if (typeof handoff.study_session_id !== "string" || handoffStatusBySession.has(handoff.study_session_id)) continue;
    if (validHandoffStatuses.has(handoff.status as HandoffStatus)) {
      handoffStatusBySession.set(handoff.study_session_id, handoff.status as HandoffStatus);
    }
  }
  const courseNameById = new Map((coursesResult.data ?? []).map((course) => [course.id, course.name]));

  return (
    <div className="study-page-unified-container">
      {/* Bernoulli Urgent Study Recipe Card */}
      <UniNovaBernoulliCard />

      {/* Full AI Study Workspace */}
      <div className="study-workspace-active-section">
        <StudyWorkspace
          documents={documents.map((document) => ({
            id: document.id,
            kind: document.kind as StudyDocumentKind,
            status: document.status,
            fileName: document.file_name,
            mimeType: document.mime_type,
            sizeBytes: Number(document.size_bytes),
            createdAt: document.created_at,
          }))}
          sessions={sessions.map((session) => ({
            id: session.id,
            title: session.title,
            status: session.status as StudySessionStatus,
            plannedFor: session.planned_for,
            targetMinutes: session.target_minutes,
            startedAt: session.started_at,
            documentNames: namesBySession.get(session.id) ?? [],
            temaResources: temaResourcesBySession.get(session.id) ?? [],
            handoffStatus: handoffStatusBySession.get(session.id) ?? null,
            courseName: session.tema_course_id ? courseNameById.get(session.tema_course_id) ?? null : null,
          }))}
        />
      </div>
    </div>
  );
}
