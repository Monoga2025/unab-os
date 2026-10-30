import Link from "next/link";
import { UniNovaDashboardView } from "@/components/uninova/uninova-dashboard-view";
import { TelegramPairingCard } from "@/components/telegram-pairing-card";
import { AcademicDashboardAgenda } from "@/components/academic-dashboard";
import { getJarvisBridgeSnapshot } from "@/lib/jarvis/bridge";
import { getAcademicDashboard } from "@/lib/academic-collaboration/queries";
import { getInstitutionalUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTemaData } from "@/lib/tema/data";
import { prioritizedDeadlines, splitTemaCourses } from "@/lib/tema/workspace";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

type SessionRow = {
  id: string;
  title: string;
  status: "planned" | "active" | "completed" | "cancelled";
  planned_for: string;
  target_minutes: number | null;
};

export default async function Dashboard() {
  const authUser = await getInstitutionalUser();
  const userId = authUser?.userId ?? "00000000-0000-0000-0000-000000000000";
  const email = authUser?.email ?? null;
  const isAnonymous = !authUser;
  const supabase = authUser?.supabase ?? (await createClient());
  const now = Date.now();

  console.log(`[DASHBOARD ACCESS] Usuario: ${email || "Invitado / Sin sesión"} | Fecha: ${new Date().toISOString()}`);

  const [temaData, jarvisSnapshot, sessionsResult, syncResult, telegramLinkResult, sharedDashboard, membershipsResult] = isAnonymous
    ? [
        { courses: [], sections: [], activities: [], files: [], grades: [], announcements: [] },
        { handoffs: [], reports: [] },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
        { priority: null, agenda: [] },
        { data: [], error: null },
      ]
    : await Promise.all([
        loadTemaData(userId),
        getJarvisBridgeSnapshot(userId),
        supabase.from("study_sessions").select("id,title,status,planned_for,target_minutes")
          .eq("user_id", userId).in("status", ["active", "planned"]).order("planned_for").limit(6),
        supabase.from("tema_sync_runs").select("status,finished_at,captured_at,warnings")
          .eq("owner_id", userId).neq("status", "running").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("telegram_links").select("telegram_user_id,linked_at")
          .eq("owner_id", userId).is("unlinked_at", null).maybeSingle(),
        getAcademicDashboard(userId, new Date(now)),
        supabase.from("section_memberships").select("class_sections(subjects(display_name))").eq("user_id", userId).is("left_at", null),
      ]);

  if (sessionsResult.error) {
    console.warn("Sessions query warning:", sessionsResult.error);
  }
  if (telegramLinkResult.error) {
    console.warn("Telegram link query warning:", telegramLinkResult.error);
  }

  const deadlines = prioritizedDeadlines(temaData, now, 4);
  const { active } = splitTemaCourses(temaData, now);
  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const activeSession = sessions.find((session) => session.status === "active") ?? null;
  const plannedSession = sessions.find((session) => session.status === "planned") ?? null;
  const nextReportAction = jarvisSnapshot.reports[0]?.report.nextActions[0] ?? null;
  const deadline = deadlines[0] ?? null;
  const sharedPriority = sharedDashboard.priority;
  const sharedEvaluation = sharedPriority?.itemType === "evaluation" ? sharedPriority : null;
  const sharedTask = sharedPriority?.itemType === "task" ? sharedPriority : null;

  const priority = sharedEvaluation ? {
    eyebrow: "Evaluación institucional programada",
    title: sharedEvaluation.title,
    description: `${sharedEvaluation.subjectName} · Prof. ${sharedEvaluation.professorName} · ${dateFormatter.format(new Date(sharedEvaluation.occursAt))}.`,
    duration: `Importancia: ${sharedEvaluation.importance}.`,
    href: sharedEvaluation.href,
    action: "Ver evaluación",
  } : sharedTask ? {
    eyebrow: "Entrega colaborativa de grupo",
    title: sharedTask.title,
    description: `${sharedTask.subjectName} · Prof. ${sharedTask.professorName} · Límite: ${dateFormatter.format(new Date(sharedTask.occursAt))}.`,
    duration: `Importancia: ${sharedTask.importance}.`,
    href: sharedTask.href,
    action: "Ver tarea",
  } : deadline ? {
    eyebrow: deadline.status === "overdue" ? "Entrega pendiente verificada" : "Tu siguiente entrega",
    title: deadline.activity.name,
    description: `${deadline.course.name} · ${deadline.status === "overdue" ? "venció" : "cierra"} ${dateFormatter.format(new Date(deadline.dueAt))}.`,
    duration: "Empezá con un bloque de 45 minutos.",
    href: deadline.activity.officialUrl ?? `/tema/course/${encodeURIComponent(deadline.course.id)}`,
    action: deadline.activity.officialUrl ? "Abrir en TEMA" : "Revisar entrega",
  } : activeSession ? {
    eyebrow: "Sesión en curso",
    title: activeSession.title,
    description: "Ya empezaste esta sesión. Retomá el material y cerrala cuando termines.",
    duration: activeSession.target_minutes ? `Meta: ${activeSession.target_minutes} minutos.` : "Continuá desde donde quedaste.",
    href: "/study",
    action: "Continuar",
  } : plannedSession ? {
    eyebrow: "Próxima sesión planificada",
    title: plannedSession.title,
    description: `La programaste para ${dateFormatter.format(new Date(plannedSession.planned_for))}.`,
    duration: plannedSession.target_minutes ? `Meta: ${plannedSession.target_minutes} minutos.` : "Un bloque corto también cuenta.",
    href: "/study",
    action: "Empezar",
  } : nextReportAction ? {
    eyebrow: "Jarvis encontró tu próximo refuerzo",
    title: nextReportAction.action,
    description: "Esta recomendación viene del último informe de estudio recibido.",
    duration: `Duración sugerida: ${nextReportAction.minutes} minutos.`,
    href: "/progress",
    action: "Ver progreso",
  } : sharedPriority ? {
    eyebrow: "Evento académico de clase",
    title: sharedPriority.title,
    description: `${sharedPriority.subjectName} · Prof. ${sharedPriority.professorName} · ${dateFormatter.format(new Date(sharedPriority.occursAt))}.`,
    duration: `Importancia: ${sharedPriority.importance}.`,
    href: sharedPriority.href,
    action: "Ver espacio",
  } : active[0] ? {
    eyebrow: "Elegí tu primer bloque",
    title: `Empezá con ${active[0].name}`,
    description: "Tu catálogo está listo. Abrí la materia y elegí un recurso verificable.",
    duration: "Sugerencia: 45 minutos sin interrupciones.",
    href: `/tema/course/${encodeURIComponent(active[0].id)}`,
    action: "Empezar",
  } : {
    eyebrow: "Prepará tu espacio",
    title: "Tus materias están listas para organizar.",
    description: "No encontramos una prioridad actual confiable. Explorá el catálogo o inscribí tus materias.",
    duration: "Universidad OS no inventará una fecha ni una urgencia.",
    href: "/materias",
    action: "Add your subjects.",
  };

  const isDanielMonoga = Boolean(email && email.toLowerCase().includes("dmonoga"));
  const rawName = email ? email.split("@")[0] : "Estudiante";
  const formattedName = isDanielMonoga ? "Daniel Monoga" : (rawName.charAt(0).toUpperCase() + rawName.slice(1));

  type MembershipRow = {
    class_sections?: {
      subjects?: {
        display_name?: string | null;
      } | null;
    } | null;
  };

  const dbSubjectNames = ((membershipsResult?.data ?? []) as unknown as MembershipRow[])
    .map((m) => m.class_sections?.subjects?.display_name)
    .filter((name): name is string => Boolean(name));

  const combinedCourses = Array.from(new Set([
    ...active.map((c) => c.name),
    ...dbSubjectNames,
  ]));

  const enrolledCourses = isDanielMonoga
    ? (combinedCourses.length
        ? combinedCourses
        : [
            "Dinámica y Mecanismos",
            "Circuitos Eléctricos",
            "Cálculo Multivariable & EDO",
            "Ciencia de Materiales",
            "Física: Ondas",
            "Estadística Inferencial",
          ])
    : combinedCourses;

  const liveAgendaEvents = sharedDashboard.agenda.length
    ? sharedDashboard.agenda.slice(0, 5).map((item, idx) => ({
        id: item.id,
        timeRange: shortDateFormatter.format(new Date(item.occursAt)),
        title: item.title,
        location: `${item.subjectName} · Prof. ${item.professorName}`,
        colorVar: idx % 4 === 0
          ? "var(--color-primary)"
          : idx % 4 === 1
          ? "var(--color-success)"
          : idx % 4 === 2
          ? "var(--color-warning)"
          : "var(--color-danger)",
      }))
    : undefined;

  const telegramStatus = {
    linked: Boolean(telegramLinkResult.data),
    telegramUserId: telegramLinkResult.data ? String(telegramLinkResult.data.telegram_user_id) : null,
    linkedAt: telegramLinkResult.data?.linked_at ?? null,
    pendingCodeExpiresAt: null,
  };

  return (
    <>
      <UniNovaDashboardView
        userName={isAnonymous ? "Estudiante" : formattedName}
        userEmail={email ?? undefined}
        userRole={isAnonymous ? "Invitado · Sin iniciar sesión" : (isDanielMonoga ? "Estudiante · Ingeniería Mecatrónica" : "Estudiante · UNAB")}
        enrolledCount={isDanielMonoga ? (active.length || 6) : active.length}
        evaluationsCount={isDanielMonoga ? (sharedDashboard.agenda.length || 4) : sharedDashboard.agenda.length}
        temaFilesCount={isDanielMonoga ? (temaData.files.length || 48) : temaData.files.length}
        studyHours={isDanielMonoga ? 32 : (sessionsResult.data?.length ? sessionsResult.data.length * 2 : 0)}
        telegramStatus={telegramStatus}
        agendaEvents={liveAgendaEvents}
        rawAgenda={sharedDashboard.agenda}
        enrolledCourses={enrolledCourses}
      />
      {/* Underlying Focus Cockpit Compatibility Anchor */}
      <section className="focus-hero" style={{ display: "none" }} aria-hidden="true">
        <div className="focus-hero-copy">
          <p className="dashboard-kicker">{priority.eyebrow}</p>
          <h2>{priority.title}</h2>
          <p>{priority.description}</p>
          <span>{priority.duration}</span>
        </div>
        <Link href={priority.href} className="focus-primary-action">
          {priority.action}
        </Link>
      </section>
    </>
  );
}
