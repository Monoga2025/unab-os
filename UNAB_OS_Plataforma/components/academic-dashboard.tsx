"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBogotaDateTime } from "@/lib/academic-collaboration/dates";
import type { AcademicAgendaEntry } from "@/lib/domain/academic-collaboration";

type Props = {
  agenda: AcademicAgendaEntry[];
};

type ScheduleDay = {
  id: string;
  dayLabel: string;
  dateNumber: string;
  isToday?: boolean;
  items: Array<{
    id: string;
    type: "task" | "quiz" | "video" | "evaluation";
    subject: string;
    title: string;
    description: string;
    time?: string;
    completed?: boolean;
    importance: "normal" | "high" | "critical";
  }>;
};

const DEFAULT_WEEK_SCHEDULE: ScheduleDay[] = [
  {
    id: "lunes-14",
    dayLabel: "Lunes",
    dateNumber: "14",
    isToday: true,
    items: [
      {
        id: "lunes-item-1",
        type: "task",
        subject: "Cálculo",
        title: "Resolver y entender ejercicio de Cálculo",
        description: "Repasar el planteamiento y asegurar la resolución paso a paso.",
        importance: "high",
      },
      {
        id: "lunes-item-2",
        type: "video",
        subject: "Cálculo",
        title: "Ver video explicativo de Cálculo",
        description: "Revisar la lección en video para afianzar conceptos clave.",
        importance: "normal",
      },
    ],
  },
  {
    id: "martes-15",
    dayLabel: "Martes",
    dateNumber: "15",
    items: [
      {
        id: "martes-item-1",
        type: "quiz",
        subject: "Circuitos Eléctricos",
        title: "⚡ Quiz de Circuitos",
        description: "Temas evaluados: Hasta Thévenin, sin incluirlo.",
        importance: "critical",
      },
    ],
  },
  {
    id: "miercoles-16",
    dayLabel: "Miércoles",
    dateNumber: "16",
    items: [
      {
        id: "miercoles-item-1",
        type: "quiz",
        subject: "Dibujo Asistido",
        title: "🎯 Quiz de Dibujo (Calibrador)",
        description: "Evaluación sobre lectura del calibrador en pulgadas.",
        time: "18:00",
        importance: "critical",
      },
      {
        id: "miercoles-item-2",
        type: "task",
        subject: "CAD / Modelado",
        title: "📐 Entregar las dos botellas de CAD",
        description: "Subir archivos de modelado 3D de las dos botellas.",
        time: "18:00",
        importance: "high",
      },
      {
        id: "miercoles-item-3",
        type: "task",
        subject: "Dibujo Asistido",
        title: "🧴 Entregar la garrafa de Dibujo",
        description: "Planos y vistas de la garrafa terminados.",
        time: "18:00",
        importance: "high",
      },
    ],
  },
  {
    id: "jueves-17",
    dayLabel: "Jueves",
    dateNumber: "17",
    items: [
      {
        id: "jueves-item-1",
        type: "task",
        subject: "Mecanismos",
        title: "Análisis cinemático de eslabonamientos",
        description: "Revisión de grados de libertad y síntesis de mecanismos.",
        importance: "normal",
      },
    ],
  },
  {
    id: "viernes-18",
    dayLabel: "Viernes",
    dateNumber: "18",
    items: [
      {
        id: "viernes-item-1",
        type: "task",
        subject: "Laboratorio Ondas",
        title: "Informe de práctica de ondas",
        description: "Toma de datos experimentales y cálculo de frecuencias.",
        time: "10:00",
        importance: "high",
      },
    ],
  },
];

export function AcademicDashboardAgenda({ agenda }: Props) {
  const [selectedDayId, setSelectedDayId] = useState("lunes-14");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleComplete = (itemId: string) => {
    setCompletedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const currentDay = DEFAULT_WEEK_SCHEDULE.find((d) => d.id === selectedDayId) || DEFAULT_WEEK_SCHEDULE[0];

  return (
    <div className="academic-live-dashboard">
      {/* HEADER DE LA AGENDA SEMANAL */}
      <div className="academic-schedule-nav">
        <div className="academic-schedule-tabs" role="tablist" aria-label="Días de la semana">
          {DEFAULT_WEEK_SCHEDULE.map((day) => {
            const isSelected = day.id === selectedDayId;
            return (
              <button
                key={day.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`academic-day-tab ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedDayId(day.id)}
              >
                <span className="academic-day-name">{day.dayLabel}</span>
                <span className="academic-day-num">{day.dateNumber}</span>
                {day.isToday && <span className="academic-today-dot" title="Hoy" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTA DE ACTIVIDADES DEL DÍA SELECCIONADO */}
      <div className="academic-day-content">
        <div className="academic-day-heading">
          <h3>
            📅 {currentDay.dayLabel} {currentDay.dateNumber} de Septiembre
          </h3>
          <span className="academic-task-counter">
            {currentDay.items.filter((i) => completedItems[i.id]).length} / {currentDay.items.length} completadas
          </span>
        </div>

        <div className="academic-timeline-list">
          {currentDay.items.map((item) => {
            const isDone = completedItems[item.id] || false;
            return (
              <div
                key={item.id}
                className={`academic-timeline-card ${isDone ? "is-completed" : ""} importance-${item.importance}`}
              >
                <button
                  type="button"
                  className="academic-check-circle-btn"
                  onClick={() => toggleComplete(item.id)}
                  aria-label={isDone ? "Marcar como pendiente" : "Marcar como lista"}
                >
                  <span className="academic-check-icon">{isDone ? "✓" : ""}</span>
                </button>

                <div className="academic-timeline-details">
                  <div className="academic-card-badges">
                    <span className="academic-subject-pill">{item.subject}</span>
                    {item.time && <span className="academic-time-pill">⏰ {item.time}</span>}
                    {item.importance === "critical" && <span className="academic-urgency-pill">🔥 Urgente</span>}
                  </div>
                  <strong className="academic-item-main-title">{item.title}</strong>
                  <p className="academic-item-desc">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AGENDA INSTITUCIONAL VINCULADA DESDE GRUPOS */}
      {agenda.length > 0 && (
        <div className="academic-enrolled-agenda-section">
          <h4>Evaluaciones Oficiales Registradas</h4>
          <div className="academic-enrolled-agenda-grid">
            {agenda.slice(0, 4).map((entry) => (
              <article key={entry.id} className="academic-agenda-compact-card">
                <div className="academic-entry-meta">
                  <span className={`academic-type-badge ${entry.itemType}`}>{entry.itemType}</span>
                  <span className="academic-entry-subject">{entry.subjectName} · {entry.professorName}</span>
                </div>
                <h5 className="academic-entry-title">
                  <Link href={entry.href} className="academic-title-link">
                    {entry.title}
                  </Link>
                </h5>
                <time className="academic-entry-time" dateTime={entry.occursAt}>
                  {formatBogotaDateTime(entry.occursAt)}
                </time>
              </article>
            ))}
          </div>
        </div>
      )}

      {agenda.length === 0 && (
        <div className="academic-dashboard-footer-prompt">
          <span>¿Quieres ver las fechas de tus otros grupos aquí?</span>
          <Link href="/materias" className="academic-btn academic-btn-outline academic-btn-sm">
            ＋ Añadir más materias
          </Link>
        </div>
      )}
    </div>
  );
}
