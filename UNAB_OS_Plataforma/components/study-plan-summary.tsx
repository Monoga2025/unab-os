import Link from "next/link";
import { buildStudyPlan, type StudyPlanSession } from "@/lib/domain/study-plan";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function SessionItem({ session, prominent = false }: { session: StudyPlanSession; prominent?: boolean }) {
  return (
    <article className={`study-plan-session${prominent ? " prominent" : ""}`}>
      <div>
        {session.status === "active" && <span className="study-plan-active">En curso</span>}
        <strong>{session.title}</strong>
        {session.targetMinutes !== null && <small>{session.targetMinutes} min objetivo</small>}
      </div>
      <time dateTime={session.plannedFor}>{dateFormatter.format(new Date(session.plannedFor))}</time>
    </article>
  );
}

function EmptyPlan({ compact }: { compact: boolean }) {
  return (
    <div className="study-plan-empty">
      <strong>No hay un plan todavía.</strong>
      <p>Planificá una sesión para organizar tu próximo repaso.</p>
      {compact && <Link href="/study">Ir a planificar</Link>}
    </div>
  );
}

export function StudyPlanSummary({ sessions, compact = false }: { sessions: StudyPlanSession[]; compact?: boolean }) {
  const plan = buildStudyPlan(sessions);
  const hasPlan = Boolean(plan.nextSession || plan.tomorrow.length || plan.thisWeek.length);

  if (!hasPlan && compact) return <EmptyPlan compact />;

  return (
    <div className={`study-plan-summary${compact ? " compact" : ""}`} aria-label="Resumen del plan de estudio">
      <section className="study-plan-group" aria-labelledby={compact ? "rail-next-session" : "next-session"}>
        <h3 id={compact ? "rail-next-session" : "next-session"}>Próxima sesión</h3>
        {plan.nextSession
          ? <SessionItem session={plan.nextSession} prominent />
          : <p className="study-plan-group-empty">No hay una próxima sesión planificada.</p>}
      </section>
      <section className="study-plan-group" aria-labelledby={compact ? "rail-tomorrow" : "study-tomorrow"}>
        <h3 id={compact ? "rail-tomorrow" : "study-tomorrow"}>Mañana</h3>
        {plan.tomorrow.length
          ? <div className="study-plan-list">{plan.tomorrow.map((session) => <SessionItem key={session.id} session={session} />)}</div>
          : <p className="study-plan-group-empty">No hay sesiones para mañana.</p>}
      </section>
      <section className="study-plan-group" aria-labelledby={compact ? "rail-this-week" : "study-this-week"}>
        <h3 id={compact ? "rail-this-week" : "study-this-week"}>Esta semana</h3>
        {plan.thisWeek.length
          ? <div className="study-plan-list">{plan.thisWeek.map((session) => <SessionItem key={session.id} session={session} />)}</div>
          : <p className="study-plan-group-empty">No hay más sesiones esta semana.</p>}
      </section>
      {compact && <Link className="study-plan-link" href="/study">Ver y editar plan</Link>}
    </div>
  );
}
