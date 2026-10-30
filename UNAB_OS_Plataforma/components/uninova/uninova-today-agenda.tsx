"use client";

import React from "react";
import Link from "next/link";

export interface AgendaEventItem {
  id: string;
  timeRange: string;
  title: string;
  location: string;
  colorVar: string;
}

const DEFAULT_TODAY_EVENTS: AgendaEventItem[] = [
  {
    id: "e1",
    timeRange: "Lun 21 Sep · 08:00 AM",
    title: "Parcial de Cálculo (Integrales & EDO)",
    location: "Prof. Martha Cecilia / Leidy Johanna · Aula 302",
    colorVar: "var(--color-danger)",
  },
  {
    id: "e2",
    timeRange: "Mar 22 Sep · 11:59 PM",
    title: "Entrega Portafolio de Circuitos Eléctricos",
    location: "Prof. Ricardo Duarte · Plataforma TEMA",
    colorVar: "var(--color-warning)",
  },
  {
    id: "e3",
    timeRange: "Mié 23 Sep · 10:00 AM",
    title: "Parcial de Física: Ondas y Partículas (M.A.S.)",
    location: "Prof. Gabriel Torres · Laboratorio de Física",
    colorVar: "var(--color-danger)",
  },
  {
    id: "e4",
    timeRange: "Jue 24 Sep · 18:00 PM",
    title: "Taller: 25 Ejercicios Circuitos & Síntesis 2 Posiciones",
    location: "Prof. Duarte / Hernán Ospina · Taller Mecatrónica",
    colorVar: "var(--color-primary)",
  },
  {
    id: "e5",
    timeRange: "Vie 25 Sep · 02:00 PM",
    title: "Parcial de Mecanismos (Cinemática 4 Barras)",
    location: "Prof. Hernán Ospina · Aula de Mecatrónica",
    colorVar: "var(--color-danger)",
  },
];

export function UniNovaTodayAgenda({
  dateTitle = "Próximas evaluaciones & entregas",
  events = DEFAULT_TODAY_EVENTS,
  calendarHref = "/dashboard?tab=agenda",
}: {
  dateTitle?: string;
  events?: AgendaEventItem[];
  calendarHref?: string;
}) {
  return (
    <div className="uninova-agenda-card">
      <div className="uninova-agenda-header">
        <div>
          <h3 className="uninova-agenda-title">Agenda de hoy</h3>
          <span className="uninova-agenda-date">{dateTitle}</span>
        </div>
        <Link href={calendarHref} className="uninova-agenda-calendar-link">
          Ver calendario <span>→</span>
        </Link>
      </div>

      <div className="uninova-timeline-list">
        {events.map((ev, index) => {
          const isLast = index === events.length - 1;
          return (
            <div key={ev.id} className="uninova-timeline-row">
              <div className="uninova-timeline-time-col">
                <span
                  className="uninova-timeline-bullet"
                  style={{ backgroundColor: ev.colorVar }}
                  aria-hidden="true"
                />
                {!isLast && <span className="uninova-timeline-connector" aria-hidden="true" />}
                <time className="uninova-timeline-time">{ev.timeRange}</time>
              </div>

              <div className="uninova-timeline-details-col">
                <strong className="uninova-timeline-event-title">{ev.title}</strong>
                <span className="uninova-timeline-location">{ev.location}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
