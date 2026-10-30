"use client";

import React from "react";

export interface FunnelStage {
  id: string;
  name: string;
  count: string;
  percentage: string;
  bgVar?: string;
  fgVar?: string;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { id: "mat", name: "Inscritos (18 Cr.)", count: "6 Materias", percentage: "100%", bgVar: "var(--color-primary-strong)", fgVar: "var(--color-text-inverse)" },
  { id: "c1", name: "Corte 1 (30%)", count: "18 Cr. Salvados", percentage: "100%", bgVar: "var(--color-primary)", fgVar: "var(--color-text-inverse)" },
  { id: "c2", name: "Corte 2 (30%)", count: "15 Cr. en Meta", percentage: "83%", bgVar: "var(--color-info)", fgVar: "var(--color-text-inverse)" },
  { id: "hab", name: "Exentos Habil.", count: "0 en Riesgo", percentage: "100%", bgVar: "var(--color-info-soft)", fgVar: "var(--color-text)" },
  { id: "meta", name: "Meta Aprobatoria", count: "PGA > 4.0", percentage: "100%", bgVar: "var(--color-primary-soft)", fgVar: "var(--color-primary-strong)" },
];

export function UniNovaAdmissionFunnel({
  title = "Pipeline de Aprobación & Créditos Semestrales",
  subtitle = "Progreso hacia la meta de 18 créditos aprobados (Semestre 2026-1)",
  stages = DEFAULT_STAGES,
  conversionRate = "100%",
  conversionDelta = "0 perdidas",
}: {
  title?: string;
  subtitle?: string;
  stages?: FunnelStage[];
  conversionRate?: string;
  conversionDelta?: string;
}) {
  return (
    <div className="uninova-funnel-card">
      <div className="uninova-funnel-header">
        <div>
          <h3 className="uninova-funnel-title">{title}</h3>
          <p className="uninova-funnel-subtitle">{subtitle}</p>
        </div>

        <div className="uninova-select-chip">
          <span>Semestre 2026-1</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className="uninova-funnel-body">
        {/* Chevron Funnel Flow */}
        <div className="uninova-funnel-stages">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className="uninova-funnel-stage"
              style={{
                backgroundColor: stage.bgVar,
                color: stage.fgVar,
                zIndex: stages.length - idx,
              }}
            >
              <span className="uninova-funnel-stage-name">{stage.name}</span>
              <strong className="uninova-funnel-stage-count">{stage.count}</strong>
              <small className="uninova-funnel-stage-pct">{stage.percentage}</small>
            </div>
          ))}
        </div>

        {/* Conversion Gauge Card */}
        <div className="uninova-conversion-card">
          <h4 className="uninova-conversion-title">Tasa de Aprobación Proyectada</h4>

          <div className="uninova-conversion-gauge-row">
            <div className="uninova-conversion-circle">
              <strong className="uninova-conversion-pct">{conversionRate}</strong>
              <small>créditos a salvo de repetición</small>
            </div>

            <div className="uninova-conversion-delta-block">
              <span className="uninova-kpi-delta is-positive">✓ {conversionDelta}</span>
              <small>estado de alerta nulo</small>
            </div>
          </div>

          <div className="uninova-conversion-note">
            <span className="uninova-note-icon">🛡️</span>
            <span>Ahorro proyectado de ~$2.850.000 COP al no repetir asignaturas.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
