"use client";

import React, { useState } from "react";

export interface DistributionItem {
  id: string;
  name: string;
  percentage: number;
  count: number | string;
  colorVar: string;
}

const DEFAULT_ACADEMIC_DISTRIBUTION: DistributionItem[] = [
  { id: "calc", name: "Cálculo & EDO", percentage: 22, count: "4 cr.", colorVar: "var(--color-primary)" },
  { id: "circ", name: "Circuitos Eléctricos & Lab", percentage: 22, count: "4 cr.", colorVar: "var(--color-info)" },
  { id: "meca", name: "Dinámica & Mecanismos", percentage: 17, count: "3 cr.", colorVar: "var(--color-success)" },
  { id: "onda", name: "Ondas & Partículas", percentage: 17, count: "3 cr.", colorVar: "var(--color-warning)" },
  { id: "alge", name: "Álgebra Lineal Aplicada", percentage: 11, count: "2 cr.", colorVar: "var(--color-primary-strong)" },
  { id: "etic", name: "Ética & Sociedad", percentage: 11, count: "2 cr.", colorVar: "var(--color-link)" },
];

export function UniNovaDistributionChart({
  title = "Distribución de Créditos Semestrales",
  totalNumber = "18",
  totalLabel = "Créditos Matriculados",
  filterLabel = "Semestre 2026-1",
  items = DEFAULT_ACADEMIC_DISTRIBUTION,
}: {
  title?: string;
  totalNumber?: string;
  totalLabel?: string;
  filterLabel?: string;
  items?: DistributionItem[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const radius = 68;
  const strokeWidth = 26;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="uninova-donut-card">
      <div className="uninova-donut-header">
        <h3 className="uninova-donut-title">{title}</h3>
        <div className="uninova-donut-filter-chip">
          <span>{filterLabel}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className="uninova-donut-body">
        {/* SVG Donut Visual */}
        <div className="uninova-donut-visual-wrap">
          <svg viewBox="0 0 200 200" className="uninova-donut-svg">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--color-border-soft)"
              strokeWidth={strokeWidth}
            />

            {items.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);
              accumulatedPercentage += item.percentage;
              const isHovered = hoveredId === item.id;

              return (
                <circle
                  key={item.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.colorVar}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="uninova-donut-slice"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Label */}
          <div className="uninova-donut-center-info">
            <strong className="uninova-donut-center-val">{totalNumber}</strong>
            <span className="uninova-donut-center-lbl">{totalLabel}</span>
          </div>
        </div>

        {/* Donut Breakdown Legend Table */}
        <div className="uninova-donut-legend">
          {items.map((item) => {
            const isHovered = hoveredId === item.id;
            return (
              <div
                key={item.id}
                className={`uninova-legend-row ${isHovered ? "is-hovered" : ""}`}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="uninova-legend-name-col">
                  <span
                    className="uninova-legend-dot"
                    style={{ backgroundColor: item.colorVar }}
                    aria-hidden="true"
                  />
                  <span className="uninova-legend-label">{item.name}</span>
                </div>
                <div className="uninova-legend-stats-col">
                  <span className="uninova-legend-percent">{item.percentage}%</span>
                  <span className="uninova-legend-count">{item.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
