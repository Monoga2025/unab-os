"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatBogotaDate, formatBogotaDateTime } from "@/lib/academic-collaboration/dates";
import type { AcademicAgendaEntry } from "@/lib/domain/academic-collaboration";

type Props = {
  evaluations: AcademicAgendaEntry[];
  weekStart: string;
};

export function AcademicEvaluationCalendar({ evaluations, weekStart }: Props) {
  const [view, setView] = useState<"calendar" | "agenda">("calendar");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedImportance, setSelectedImportance] = useState<string>("all");
  const [activeModalEntry, setActiveModalEntry] = useState<AcademicAgendaEntry | null>(null);

  const start = new Date(weekStart);
  const prevWeek = new Date(start);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const prevWeekIso = prevWeek.toISOString().slice(0, 10);
  const nextWeekIso = nextWeek.toISOString().slice(0, 10);

  // 7 days of the week starting Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    return day;
  });

  // Evaluaciones directas del usuario o vacías si es una cuenta nueva
  const effectiveEvaluations: AcademicAgendaEntry[] = useMemo(() => {
    return evaluations;
  }, [evaluations]);

  // Lista única de materias para el filtro
  const subjectOptions = useMemo(() => {
    const set = new Set(effectiveEvaluations.map((e) => e.subjectName));
    return Array.from(set);
  }, [effectiveEvaluations]);

  // Evaluaciones filtradas
  const filteredEvaluations = useMemo(() => {
    return effectiveEvaluations.filter((ev) => {
      const matchSubject = selectedSubject === "all" || ev.subjectName === selectedSubject;
      const matchImportance = selectedImportance === "all" || ev.importance === selectedImportance;
      return matchSubject && matchImportance;
    });
  }, [effectiveEvaluations, selectedSubject, selectedImportance]);

  return (
    <div className="academic-evaluation-calendar-wrap">
      <header className="academic-eval-header">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-primary)", marginBottom: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} />
            Radar de Fechas Críticas & Parciales UNAB
          </div>
          <h1 className="academic-heading">Evaluaciones, Quices & Entregas</h1>
          <p className="academic-subheading">
            Calendario oficial sincronizado. Cero sorpresas de quices ni entregas olvidadas a las 11:59 PM.
          </p>
        </div>

        <div className="academic-eval-controls">
          <div className="academic-week-nav" role="navigation" aria-label="Navegación de semanas">
            <Link
              href={`/evaluaciones?week=${prevWeekIso}`}
              className="academic-btn academic-btn-secondary academic-btn-sm"
              aria-label="Semana anterior"
            >
              ← Anterior
            </Link>
            <span className="academic-current-week-label">
              Semana del {formatBogotaDate(weekStart)}
            </span>
            <Link
              href={`/evaluaciones?week=${nextWeekIso}`}
              className="academic-btn academic-btn-secondary academic-btn-sm"
              aria-label="Semana siguiente"
            >
              Siguiente →
            </Link>
          </div>

          <div className="academic-view-toggle">
            <button
              type="button"
              className={`academic-tab-btn ${view === "calendar" ? "active" : ""}`}
              onClick={() => setView("calendar")}
            >
              Vista de cuadrícula
            </button>
            <button
              type="button"
              className={`academic-tab-btn ${view === "agenda" ? "active" : ""}`}
              onClick={() => setView("agenda")}
            >
              Vista de agenda
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          marginBottom: "18px",
        }}
      >
        {/* Subject Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Materia:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubject("all")}
            style={{
              padding: "4px 10px",
              borderRadius: "14px",
              fontSize: "0.78rem",
              fontWeight: selectedSubject === "all" ? 700 : 500,
              backgroundColor: selectedSubject === "all" ? "var(--color-primary)" : "var(--color-bg-subtle)",
              color: selectedSubject === "all" ? "#ffffff" : "var(--color-text)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Todas ({effectiveEvaluations.length})
          </button>
          {subjectOptions.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              style={{
                padding: "4px 10px",
                borderRadius: "14px",
                fontSize: "0.78rem",
                fontWeight: selectedSubject === sub ? 700 : 500,
                backgroundColor: selectedSubject === sub ? "var(--color-primary)" : "var(--color-bg-subtle)",
                color: selectedSubject === sub ? "#ffffff" : "var(--color-text)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {sub.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Importance Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            Urgencia:
          </span>
          {[
            { id: "all", label: "Todas" },
            { id: "critical", label: "🚨 Críticas (Parciales)" },
            { id: "high", label: "⚠️ Altas (Talleres)" },
          ].map((imp) => (
            <button
              key={imp.id}
              type="button"
              onClick={() => setSelectedImportance(imp.id)}
              style={{
                padding: "4px 10px",
                borderRadius: "14px",
                fontSize: "0.76rem",
                fontWeight: selectedImportance === imp.id ? 700 : 500,
                backgroundColor: selectedImportance === imp.id ? "var(--color-bg-subtle)" : "transparent",
                color: "var(--color-text)",
                border: selectedImportance === imp.id ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                cursor: "pointer",
              }}
            >
              {imp.label}
            </button>
          ))}
        </div>
      </div>

      {view === "calendar" ? (
        <div className="academic-calendar-grid" role="region" aria-label="Cuadrícula semanal de evaluaciones">
          {weekDays.map((day) => {
            const dayIso = day.toISOString().slice(0, 10);
            const dayEvaluations = filteredEvaluations.filter((ev) => ev.occursAt.slice(0, 10) === dayIso);

            return (
              <div key={dayIso} className="academic-calendar-day-col">
                <header className="academic-day-col-header">
                  <strong>{formatBogotaDate(day.toISOString())}</strong>
                </header>

                <div className="academic-day-col-body">
                  {dayEvaluations.length > 0 ? (
                    dayEvaluations.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setActiveModalEntry(ev)}
                        className={`academic-cal-card ${ev.importance}`}
                        style={{ cursor: "pointer" }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="academic-cal-card-subject">{ev.subjectName}</span>
                        <strong className="academic-cal-card-title">{ev.title}</strong>
                        <small className="academic-cal-card-prof">{ev.professorName}</small>
                        <time className="academic-cal-card-time">{formatBogotaDateTime(ev.occursAt)}</time>
                      </div>
                    ))
                  ) : (
                    <div className="academic-day-empty">Sin evaluaciones</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Agenda view */}
      <section className={`academic-eval-agenda-list ${view === "agenda" ? "active" : ""}`} aria-labelledby="agenda-heading">
        <h2 id="agenda-heading" className="academic-section-title">Vista de agenda</h2>

        {filteredEvaluations.length > 0 ? (
          <div className="academic-item-grid">
            {filteredEvaluations.map((ev) => (
              <article key={ev.id} className="academic-content-card">
                <header className="academic-content-header">
                  <span className={`academic-importance-badge ${ev.importance}`}>{ev.importance}</span>
                  <span className="academic-card-subtitle">{ev.subjectName} · {ev.professorName}</span>
                </header>

                <h3 className="academic-content-title">
                  <span
                    onClick={() => setActiveModalEntry(ev)}
                    style={{ cursor: "pointer", color: "inherit" }}
                  >
                    {ev.title}
                  </span>
                </h3>

                <footer className="academic-content-footer">
                  <span className="academic-due-time">
                    📅 Fecha: {formatBogotaDateTime(ev.occursAt)}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setActiveModalEntry(ev)}
                      className="academic-btn academic-btn-secondary academic-btn-sm"
                    >
                      Ver resumen
                    </button>
                    <Link href={ev.href} className="academic-btn academic-btn-primary academic-btn-sm">
                      Ir a la herramienta ↗
                    </Link>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="academic-empty-state">
            <p>No hay evaluaciones que coincidan con los filtros seleccionados.</p>
            <button
              type="button"
              onClick={() => { setSelectedSubject("all"); setSelectedImportance("all"); }}
              className="academic-btn academic-btn-secondary"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </section>

      {/* Quick Evaluation Detail Modal */}
      {activeModalEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setActiveModalEntry(null)}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg-surface)",
              borderRadius: "20px",
              maxWidth: "520px",
              width: "100%",
              padding: "26px",
              border: "1px solid var(--color-border)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <span className={`academic-importance-badge ${activeModalEntry.importance}`}>
                Prioridad: {activeModalEntry.importance.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setActiveModalEntry(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                }}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <h3 id="modal-title" style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text)", margin: "0 0 8px 0" }}>
              {activeModalEntry.title}
            </h3>

            <div style={{ fontSize: "0.88rem", color: "var(--color-text-muted)", marginBottom: "18px" }}>
              <strong>Asignatura:</strong> {activeModalEntry.subjectName} · <strong>Docente:</strong> {activeModalEntry.professorName}
            </div>

            <div style={{ backgroundColor: "var(--color-bg-subtle)", padding: "14px", borderRadius: "12px", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text)" }}>
                📅 Programación Oficial
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary-strong)", marginTop: "2px" }}>
                {formatBogotaDateTime(activeModalEntry.occursAt)}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setActiveModalEntry(null)}
                className="academic-btn academic-btn-secondary academic-btn-sm"
              >
                Cerrar
              </button>
              <Link
                href={activeModalEntry.href}
                className="academic-btn academic-btn-primary academic-btn-sm"
              >
                Abrir en Módulo ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
