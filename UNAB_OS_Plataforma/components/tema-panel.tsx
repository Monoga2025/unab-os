"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type TemaPanelCourse = Readonly<{
  id: string;
  name: string;
  sectionCount: number;
  activityCount: number;
  fileCount: number;
  accessFailed: boolean;
  state: "active" | "historical" | "unknown";
}>;

export type TemaPanelActivity = Readonly<{
  id: string;
  courseId: string;
  courseName: string;
  sectionTitle: string;
  name: string;
  moduleType: string;
  status: "graded" | "submitted" | "overdue" | "upcoming" | "undated" | "historical";
  deadlineWindow: "tomorrow" | "this_week" | "later" | null;
  dueAt: string | null;
}>;

export type TemaPanelFile = Readonly<{
  candidateId: string;
  courseId: string;
  courseName: string;
  activityName: string;
  fileName: string;
  fileType: string;
  bytes: number;
}>;

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

function CourseGrid({ courses, empty }: { courses: readonly TemaPanelCourse[]; empty: string }) {
  if (!courses.length) return <p className="tema-empty">{empty}</p>;
  return <ul className="tema-course-grid">{courses.map((course) => <li key={course.id}>
    <Link href={`/tema/course/${encodeURIComponent(course.id)}`}>
      <span className="tema-course-mark" aria-hidden="true">{course.name.slice(0, 1).toLocaleUpperCase("es")}</span>
      <div><strong>{course.name}</strong><small>{course.activityCount} actividades · {course.fileCount} recursos</small>{course.accessFailed && <span className="tema-access-warning">Captura parcial</span>}</div>
      <span aria-hidden="true">→</span>
    </Link>
  </li>)}</ul>;
}

export function TemaPanel({ courses, activities, files }: {
  courses: readonly TemaPanelCourse[];
  activities: readonly TemaPanelActivity[];
  files: readonly TemaPanelFile[];
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("es");
  const visibleCourses = useMemo(() => courses.filter((course) => !normalized || course.name.toLocaleLowerCase("es").includes(normalized)), [courses, normalized]);
  const active = visibleCourses.filter((course) => course.state === "active");
  const other = visibleCourses.filter((course) => course.state !== "active");
  const activeIds = new Set(active.map((course) => course.id));
  const agenda = activities.filter((activity) => activeIds.has(activity.courseId)
    && (activity.status === "upcoming" || activity.status === "overdue") && activity.dueAt)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!)).slice(0, 5);

  return <main className="tema-page materia-home">
    <header className="materia-hero">
      <div><p className="dashboard-kicker">Tu semestre, ordenado</p><h1>Materias</h1><p>Entrá a una materia para ver sus actividades, recursos y acciones de estudio con Jarvis.</p></div>
      <label><span>Buscar materia</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. ecuaciones" /></label>
    </header>

    <section className="materia-layout">
      <article className="tema-card materia-courses" aria-labelledby="active-courses-title">
        <div className="tema-card-heading"><div><p className="section-label">Semestre actual</p><h2 id="active-courses-title">Materias activas</h2></div><span>{active.length}</span></div>
        <CourseGrid courses={active} empty="No hay materias activas que coincidan con la búsqueda." />
      </article>
      <aside className="tema-card materia-agenda" aria-labelledby="materia-agenda-title">
        <div className="tema-card-heading"><div><p className="section-label">Lo próximo</p><h2 id="materia-agenda-title">Agenda</h2></div><span>{agenda.length}</span></div>
        {agenda.length ? <ol>{agenda.map((activity) => <li key={activity.id}>
          <span className={`tema-status ${activity.status}`}>{activity.status === "overdue" ? "Pendiente" : "Próxima"}</span>
          <Link href={`/tema/course/${encodeURIComponent(activity.courseId)}`}>{activity.name}</Link>
          <small>{activity.courseName}</small>
          <time dateTime={activity.dueAt!}>{dateFormatter.format(new Date(activity.dueAt!))}</time>
        </li>)}</ol> : <p className="tema-empty">No hay entregas inmediatas verificables.</p>}
      </aside>
    </section>

    <details className="tema-card materia-archive">
      <summary><span><strong>Históricas y sin clasificar</strong><small>Siguen disponibles y buscables, pero no compiten por tu prioridad diaria.</small></span><b>{other.length}</b></summary>
      <CourseGrid courses={other} empty="No hay otras materias para esta búsqueda." />
    </details>

    <p className="tema-method-note">{files.length} archivos privados están organizados dentro de sus materias. Ya no se mezclan en una lista global.</p>
  </main>;
}
