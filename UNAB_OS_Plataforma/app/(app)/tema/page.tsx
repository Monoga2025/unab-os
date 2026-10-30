import Link from "next/link";
import { TemaPanel, type TemaPanelActivity, type TemaPanelCourse, type TemaPanelFile } from "@/components/tema-panel";
import { TemaConnectionForm } from "@/components/tema-connection-form";
import { TemaDisconnectButton } from "@/components/tema-disconnect-button";
import { loadTemaData } from "@/lib/tema/data";
import { classifyTemaActivity } from "@/lib/tema/dates";
import { requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activityDueAt, splitTemaCourses } from "@/lib/tema/workspace";

function panelStatus(activity: ReturnType<typeof classifyTemaActivity>): TemaPanelActivity["status"] {
  if (activity.status !== "unknown") return activity.status;
  if (!activity.closesAt) return "undated";
  return activity.closesAt.timestamp <= Date.now() ? "historical" : "upcoming";
}

export default async function TemaPage() {
  const { userId } = await requireUser();
  const [data, connectionResult] = await Promise.all([
    loadTemaData(userId),
    createAdminClient().from("tema_connections").select("status,username_hint,last_synced_at").eq("owner_id", userId).maybeSingle(),
  ]);
  const now = Date.now();
  const courseById = new Map(data.courses.map((course) => [course.id, course]));
  const sectionById = new Map(data.sections.map((section) => [`${section.courseId}:${section.id}`, section]));
  const { stateByCourse } = splitTemaCourses(data, now);

  const courses: TemaPanelCourse[] = data.courses.map((course) => ({
    id: course.id,
    name: course.name,
    accessFailed: course.accessFailed,
    sectionCount: data.sections.filter((section) => section.courseId === course.id).length,
    activityCount: data.activities.filter((activity) => activity.courseId === course.id).length,
    fileCount: data.files.filter((file) => file.courseId === course.id).length,
    state: stateByCourse.get(course.id) ?? "unknown",
  }));

  const activities: TemaPanelActivity[] = data.activities.map((activity) => {
    const classification = classifyTemaActivity(activity.availabilityText, now);
    return {
      id: activity.id,
      courseId: activity.courseId,
      courseName: courseById.get(activity.courseId)?.name ?? "Materia sin nombre",
      sectionTitle: sectionById.get(`${activity.courseId}:${activity.sectionId}`)?.title ?? "Sección sin título",
      name: activity.name,
      moduleType: activity.moduleType,
      status: classification.status === "unknown"
        ? (!classification.closesAt ? "undated" : classification.closesAt.timestamp <= now ? "historical" : "upcoming")
        : panelStatus(classification),
      deadlineWindow: classification.deadlineWindow,
      dueAt: activityDueAt(activity),
    };
  }).sort((left, right) => {
    const priority = { overdue: 0, upcoming: 1, submitted: 2, graded: 3, undated: 4, historical: 5 } as const;
    return priority[left.status] - priority[right.status]
      || (left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER) - (right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, "es");
  });

  const files: TemaPanelFile[] = data.files.map((file) => ({
    candidateId: file.candidateId,
    courseId: file.courseId,
    courseName: courseById.get(file.courseId)?.name ?? "Materia sin nombre",
    activityName: file.activityName,
    fileName: file.fileName,
    fileType: file.fileType,
    bytes: file.bytes,
  }));

  const connection = connectionResult.data;
  return (
    <>
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "16px",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "18px",
        }}
      >
        <span style={{ fontSize: "2.2rem" }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                padding: "3px 10px",
                borderRadius: "20px",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              Módulo Bloqueado · Próximamente
            </span>
          </div>
          <strong style={{ fontSize: "1.05rem", color: "var(--color-text)" }}>
            Bóveda de Archivos & Materiales Moodle TEMA UNAB
          </strong>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
            El explorador masivo de archivos de clase está en mantenimiento por integración de seguridad institucional.
          </p>
        </div>
      </div>
      <div className="tema-beta-banner" style={{ display: "none" }}>
        <span className="tema-beta-badge">Beta — no conectado</span>
        <span className="tema-beta-desc">El espacio colaborativo por grupos de clase está disponible en </span>
        <Link href="/materias" className="tema-beta-link">Materias colaborativas</Link>.
      </div>
      <div className="tema-connection-wrap">
        <TemaConnectionForm connected={connection?.status === "connected"} usernameHint={connection?.username_hint ?? null} lastSyncedAt={connection?.last_synced_at ?? null} />
      </div>
      <div className="tema-disconnect-wrap">
        <TemaDisconnectButton connected={connection?.status === "connected"} />
      </div>
      <TemaPanel courses={courses} activities={activities} files={files} />
    </>
  );
}
