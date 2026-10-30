"use client";

import React from "react";

export interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "calc_simulator",
    label: "Simular Notas",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="16" y1="14" x2="16" y2="18" />
        <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
      </svg>
    ),
    onClick: () => {
      if (typeof window !== "undefined") window.location.href = "/dashboard?tab=simulador";
    },
  },
  {
    id: "agenda_dates",
    label: "Fechas & Parciales",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    onClick: () => {
      if (typeof window !== "undefined") window.location.href = "/evaluaciones";
    },
  },
  {
    id: "tema_vault",
    label: "Bóveda TEMA",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    onClick: () => {
      if (typeof window !== "undefined") window.location.href = "/tema";
    },
  },
  {
    id: "lab_2d",
    label: "Simulador 2D",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    onClick: () => {
      if (typeof window !== "undefined") window.location.href = "/mecatronica";
    },
  },
];

export function UniNovaQuickActions({
  title = "Accesos rápidos",
  actions = DEFAULT_QUICK_ACTIONS,
  onActionClick,
}: {
  title?: string;
  actions?: QuickActionItem[];
  onActionClick?: (actionId: string) => void;
}) {
  return (
    <div className="uninova-quick-actions-card">
      <h3 className="uninova-quick-actions-title">{title}</h3>

      <div className="uninova-quick-actions-grid">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            className="uninova-quick-action-btn"
            onClick={() => {
              act.onClick?.();
              onActionClick?.(act.id);
            }}
          >
            <span className="uninova-quick-action-icon">{act.icon}</span>
            <span className="uninova-quick-action-label">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
