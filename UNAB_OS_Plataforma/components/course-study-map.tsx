"use client";

import { useActionState } from "react";
import { saveCourseStudyBoundary, type AcademicMapActionState } from "@/app/actions/academic-map";
import type { AcademicTopicAnalysis } from "@/lib/domain/academic-material-analysis";

export type CourseStudySource = Readonly<{
  sourceId: string;
  label: string;
  href: string | null;
}>;

const priorityLabels: Record<AcademicTopicAnalysis["priority"], string> = {
  media: "Media",
  alta: "Alta",
  muy_alta: "Muy alta",
  maxima: "Máxima",
};

const initialState: AcademicMapActionState = { ok: true, message: "" };

export function CourseStudyMap({
  courseId,
  rows,
  sources,
  boundaryText,
  ocrNeededLabels,
}: {
  courseId: string;
  rows: readonly AcademicTopicAnalysis[];
  sources: readonly CourseStudySource[];
  boundaryText: string | null;
  ocrNeededLabels: readonly string[];
}) {
  const [state, formAction, pending] = useActionState(saveCourseStudyBoundary, initialState);
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));

  return <section className="course-study-map tema-card" aria-labelledby="course-study-map-title">
    <header className="course-study-map-header">
      <div><p className="section-label">Evidencia real del curso</p><h2 id="course-study-map-title">Mapa de estudio sin IA</h2><p>Se construye con reglas reproducibles a partir de textos extraídos y del punto exacto donde quedó la clase.</p></div>
      <span>{rows.length} temas confirmados</span>
    </header>

    {ocrNeededLabels.length > 0 && <div className="course-study-alert warning" role="status">
      <strong>Hay material que necesita OCR.</strong>
      <p>{ocrNeededLabels.join(" · ")} no participa todavía en el mapa porque no contiene texto extraíble.</p>
    </div>}

    {rows.length ? <div className="course-study-table-wrap" tabIndex={0} aria-label="Tabla desplazable del mapa de estudio">
      <table className="course-study-table">
        <thead><tr><th>Prioridad</th><th>Tema</th><th>Debes dominar</th><th>Fórmulas</th><th>Fuentes</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.topic}>
          <td><span className={`course-study-priority ${row.priority}`}>{priorityLabels[row.priority]}</span>{row.boundary && <small>Corte actual</small>}</td>
          <td><strong>{row.topic}</strong><small>Confianza {row.confidence === "high" ? "alta" : row.confidence === "medium" ? "media" : "baja"}</small></td>
          <td>{row.skill}</td>
          <td>{row.formulas.length ? <ul>{row.formulas.map((formula) => <li key={formula}><code>{formula}</code></li>)}</ul> : "Sin fórmula confirmada"}</td>
          <td><ul>{row.sourceRefs.map((sourceRef) => {
            const source = sourceById.get(sourceRef);
            const label = source?.label ?? (sourceRef.startsWith("class-progress:") ? "Avance de clase" : sourceRef);
            return <li key={sourceRef}>{source?.href
              ? <a href={source.href} target="_blank" rel="noreferrer">{label}</a>
              : <span>{label}</span>}</li>;
          })}</ul></td>
        </tr>)}</tbody>
      </table>
    </div> : <div className="course-study-empty" role="status">
      <strong>Aún no hay evidencia suficiente para construir el mapa.</strong>
      <p>Guardá dónde quedó la clase o esperá a que un PDF con texto esté disponible. No vamos a inventar temas a partir del cronograma.</p>
    </div>}

    <form className="course-study-boundary-form" action={formAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <label htmlFor={`boundary-${courseId}`}><strong>¿Dónde quedaron en clase?</strong><span>Incluí el último tema o ejercicio y los conceptos vistos. Esto limita el mapa y funciona como evidencia explícita.</span></label>
      <textarea id={`boundary-${courseId}`} name="boundaryText" maxLength={4000} defaultValue={boundaryText ?? ""} placeholder="Ej. Llegamos hasta la función de onda sinusoidal y el ejemplo f=2 Hz, A=0.075 m, v=12 m/s." required />
      <div><small>Máximo 4000 caracteres.</small><button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar ‘quedamos hasta aquí’"}</button></div>
      {state.message && <p className={`course-study-action-message ${state.ok ? "success" : "error"}`} role={state.ok ? "status" : "alert"}>{state.message}</p>}
    </form>
  </section>;
}
