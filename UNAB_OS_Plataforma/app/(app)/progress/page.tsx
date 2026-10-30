import Link from "next/link";
import { LockedProFeature } from "@/components/locked-pro-feature";
import { getJarvisBridgeSnapshot } from "@/lib/jarvis/bridge";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import { loadTemaData } from "@/lib/tema/data";
import { splitTemaCourses } from "@/lib/tema/workspace";

type Session = {
  id: string;
  tema_course_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  planned_for: string;
};

type ProgressSearchParams = Readonly<{
  history?: string | string[];
}>;

const FRESH_CAPTURE_MS = 36 * 60 * 60 * 1_000;

function duration(session: Session) {
  if (!session.started_at || !session.completed_at) return 0;
  return Math.max(0, Math.round((Date.parse(session.completed_at) - Date.parse(session.started_at)) / 60_000));
}

function normalizedSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric",
});

const syncDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
});

export default async function ProgressPage({ searchParams }: { searchParams: Promise<ProgressSearchParams> }) {
  const { supabase, userId } = await requireUser();
  const admin = createAdminClient();
  const [params, temaData, snapshot, coursesResult, sessionsResult, handoffsResult, syncResult, connectionResult] = await Promise.all([
    searchParams,
    loadTemaData(userId),
    getJarvisBridgeSnapshot(userId),
    supabase.from("tema_courses").select("id,source_id,name")
      .eq("owner_id", userId).eq("catalog_visible", true),
    supabase.from("study_sessions").select("id,tema_course_id,status,started_at,completed_at,planned_for")
      .eq("user_id", userId).order("planned_for", { ascending: false }),
    admin.from("jarvis_study_handoffs").select("id,status,created_at,delivered_at,tema_course_id")
      .eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("tema_sync_runs").select("status,finished_at,captured_at")
      .eq("owner_id", userId).neq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("tema_connections").select("status,last_synced_at").eq("owner_id", userId).maybeSingle(),
  ]);
  if (coursesResult.error) console.warn("coursesResult error:", coursesResult.error);
  if (sessionsResult.error) console.warn("sessionsResult error:", sessionsResult.error);
  if (handoffsResult.error) console.warn("handoffsResult error:", handoffsResult.error);

  const internalBySource = new Map((coursesResult.data ?? []).map((course) => [course.source_id, course.id]));
  const sourceByInternal = new Map((coursesResult.data ?? []).map((course) => [course.id, course.source_id]));
  const sessions = (sessionsResult.data ?? []) as Session[];
  const reportByHandoff = new Map(snapshot.reports.map((envelope) => [envelope.report.handoffId, envelope]));
  const handoffs = (handoffsResult.data ?? []).map((row) => {
    return { ...row, courseSourceId: row.tema_course_id ? sourceByInternal.get(row.tema_course_id) ?? null : null, report: reportByHandoff.get(row.id) ?? null };
  });

  const now = Date.now();
  const { active, stateByCourse } = splitTemaCourses(temaData, now);
  const activeIds = new Set(active.map((course) => course.id));
  const latestSync = syncResult.error ? null : syncResult.data;
  const connectionVerified = !connectionResult.error;
  const connectionActive = connectionVerified && connectionResult.data?.status === "connected";
  const captureTimestamp = Date.parse(latestSync?.finished_at ?? latestSync?.captured_at ?? connectionResult.data?.last_synced_at ?? "");
  const catalogCurrent = connectionActive
    && latestSync?.status === "complete"
    && Number.isFinite(captureTimestamp)
    && captureTimestamp >= now - FRESH_CAPTURE_MS;

  const completed = sessions.filter((session) => session.status === "completed");
  const totalMinutes = completed.reduce((sum, session) => sum + duration(session), 0);
  const reviewed = handoffs.filter((handoff) => handoff.report).length;
  const studiedCourseIds = new Set(sessions.map((session) => session.tema_course_id).filter(Boolean));

  const courseProgress = temaData.courses.map((course) => {
    const internalId = internalBySource.get(course.id);
    const courseSessions = sessions.filter((session) => session.tema_course_id === internalId);
    const courseHandoffs = handoffs.filter((handoff) => handoff.courseSourceId === course.id);
    const courseReports = courseHandoffs.flatMap((handoff) => handoff.report ? [handoff.report] : []);
    const minutes = courseSessions.filter((session) => session.status === "completed").reduce((sum, session) => sum + duration(session), 0);
    const lastDates = [
      ...courseSessions.map((session) => session.completed_at ?? session.started_at ?? session.planned_for),
      ...courseHandoffs.map((handoff) => handoff.delivered_at ?? handoff.created_at),
    ].filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left));
    return {
      course,
      courseSessions,
      courseHandoffs,
      courseReports,
      minutes,
      lastActivity: lastDates[0] ?? null,
      state: stateByCourse.get(course.id) ?? { category: "historical" as const, reason: "Curso archivado." },
      hasEvidence: courseSessions.length > 0 || courseHandoffs.length > 0,
      active: activeIds.has(course.id),
      catalogCurrent,
    };
  });

  const activeProgress = courseProgress.filter((c) => c.active);
  const previousProgress = courseProgress.filter((c) => !c.active && c.hasEvidence);
  const archivedProgress = courseProgress.filter((c) => !c.active && !c.hasEvidence);

  return (
    <main className="progress-page">
      <section className="progress-summary">
        <h2>{catalogCurrent ? "Materias activas" : "Materias de la última captura"}</h2>
        <p>TEMA no está conectado. Datos desactualizados. Referencia, no estado actual.</p>
        <div>
          <span>Fortalezas</span>
          <span>Por reforzar</span>
          <span>Próxima acción</span>
          <p>Los reportes de Jarvis nunca modifican automáticamente M0–M4.</p>
        </div>
      </section>

      {previousProgress.length > 0 && (
        <section className="progress-previous">
          <h3>Actividad anterior</h3>
        </section>
      )}

      <details className="progress-archive">
        <summary>Ver materias archivadas</summary>
        <input type="hidden" name="history" value="all" />
        <div className="progress-archive-list">
          {archivedProgress.map((p) => (
            <div key={p.course.id}>{p.course.name}</div>
          ))}
        </div>
      </details>
    </main>
  );
}
