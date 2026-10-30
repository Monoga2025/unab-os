"use client";

import React from "react";

export interface AlertTaskItem {
  id: string;
  countText: string;
  title: string;
  description: string;
  colorVar: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const DEFAULT_ALERTS: AlertTaskItem[] = [
  {
    id: "a1",
    countText: "Lun 21",
    title: "Parcial de Cálculo",
    description: "Integrales Triples y EDO · Aula 302 a las 8:00 AM.",
    colorVar: "var(--color-danger)",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "a2",
    countText: "Mar 22",
    title: "Portafolio de Circuitos",
    description: "Entrega digital de portafolio antes de las 11:59 PM.",
    colorVar: "var(--color-warning)",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "a3",
    countText: "Mié 23",
    title: "Parcial Ondas y Partículas",
    description: "M.A.S. y física ondulatoria · 10:00 AM.",
    colorVar: "var(--color-danger)",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    id: "a4",
    countText: "Vie 25",
    title: "Parcial de Mecanismos",
    description: "Síntesis de 2 posiciones y cinemática · 2:00 PM.",
    colorVar: "var(--color-danger)",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

export function UniNovaTasksAlerts({
  title = "Tareas y alertas",
  actionLabel = "Ver todas →",
  items = DEFAULT_ALERTS,
  onActionClick,
}: {
  title?: string;
  actionLabel?: string;
  items?: AlertTaskItem[];
  onActionClick?: () => void;
}) {
  return (
    <div className="uninova-alerts-card">
      <div className="uninova-alerts-header">
        <h3 className="uninova-alerts-title">{title}</h3>
        {actionLabel && (
          <button
            type="button"
            className="uninova-alerts-action-link"
            onClick={onActionClick || (() => { if (typeof window !== "undefined") window.location.href = "/evaluaciones"; })}
          >
            {actionLabel}
          </button>
        )}
      </div>

      <div className="uninova-alerts-list">
        {items.map((item) => (
          <div
            key={item.id}
            className="uninova-alert-row"
            onClick={item.onClick || (() => { if (typeof window !== "undefined") window.location.href = "/evaluaciones"; })}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <div
              className="uninova-alert-icon-wrap"
              style={{ color: item.colorVar, backgroundColor: `color-mix(in srgb, ${item.colorVar} 14%, transparent)` }}
              aria-hidden="true"
            >
              {item.icon}
            </div>

            <div className="uninova-alert-content">
              <div className="uninova-alert-title-row">
                <strong style={{ color: item.colorVar }}>{item.countText}</strong>
                <span className="uninova-alert-title-label"> {item.title}</span>
              </div>
              <p className="uninova-alert-desc">{item.description}</p>
            </div>

            <span className="uninova-alert-chevron" aria-hidden="true">
              ›
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
