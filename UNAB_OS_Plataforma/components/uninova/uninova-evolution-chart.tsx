"use client";

import React, { useState } from "react";

export interface ChartDataPoint {
  month: string;
  value: number;
  label?: string;
}

const DEFAULT_ACADEMIC_EVOLUTION_DATA: ChartDataPoint[] = [
  { month: "2024-1", value: 3.55, label: "Semestre 1: 3.55 (Cálculo I, Álgebra, Física Mecánica)" },
  { month: "2024-2", value: 3.82, label: "Semestre 2: 3.82 (Cálculo Integral, Estática)" },
  { month: "2025-1", value: 4.10, label: "Semestre 3: 4.10 (EDO, Dinámica, Señales)" },
  { month: "2025-2", value: 3.94, label: "Semestre 4: 3.94 (Mecanismos, Electrónica)" },
  { month: "2026-1 C1", value: 4.35, label: "2026-1 Corte 1: 4.35 (Cálculo Multivariable, Circuitos)" },
  { month: "2026-1 Meta", value: 4.20, label: "2026-1 Meta Proyectada: 4.20" },
];

export function UniNovaEvolutionChart({
  title = "Evolución de Promedio Académico (PGA)",
  subtitle = "Histórico semestral y rendimiento acumulado UNAB (Escala 0.0 - 5.0)",
  data = DEFAULT_ACADEMIC_EVOLUTION_DATA,
  rangeLabel = "Histórico de Carrera",
  valuePrefix = "",
  valueSuffix = " / 5.0",
  maxValue = 5.0,
}: {
  title?: string;
  subtitle?: string;
  data?: ChartDataPoint[];
  rangeLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxValue?: number;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number>(4); // 2026-1 C1 by default

  const width = 640;
  const height = 240;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, ...d, index };
  });

  // SVG path generation
  const linePath = points.reduce((acc, curr, index) => {
    if (index === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[index - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  const activePoint = points[activePointIndex] || points[8];

  const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];

  return (
    <div className="uninova-chart-card">
      <div className="uninova-chart-header">
        <div>
          <h3 className="uninova-chart-title">{title}</h3>
          <p className="uninova-chart-subtitle">{subtitle}</p>
        </div>

        <div className="uninova-chart-filter-chip">
          <span>{rangeLabel}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div className="uninova-chart-canvas-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="uninova-evolution-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="uninovaChartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (tick / maxValue) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray={tick === 0 ? "0" : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="uninova-chart-axis-text"
                >
                  {valuePrefix}
                  {tick >= 1000 ? `${(tick / 1000).toLocaleString()}k` : maxValue <= 10 ? tick.toFixed(1) : tick}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#uninovaChartGradient)" />

          {/* Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Vertical Dotted Guideline for Active Point */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + chartHeight}
              stroke="var(--color-primary)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              opacity="0.75"
            />
          )}

          {/* Data Points */}
          {points.map((p) => {
            const isSelected = p.index === activePointIndex;
            return (
              <g
                key={p.month}
                className="uninova-chart-point-group"
                onClick={() => setActivePointIndex(p.index)}
                onMouseEnter={() => setActivePointIndex(p.index)}
                tabIndex={0}
                role="button"
                aria-label={`${p.month}: ${valuePrefix}${p.value.toLocaleString()}${valueSuffix}`}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 4}
                  fill="var(--color-bg-surface)"
                  stroke="var(--color-primary)"
                  strokeWidth={isSelected ? 3.5 : 2}
                  className="uninova-chart-point-circle"
                />
                <text
                  x={p.x}
                  y={height - 14}
                  textAnchor="middle"
                  className={`uninova-chart-month-label ${isSelected ? "is-selected" : ""}`}
                >
                  {p.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Pill */}
        {activePoint && (
          <div
            className="uninova-chart-floating-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.max(10, (activePoint.y / height) * 100 - 32)}%`,
            }}
          >
            <span className="uninova-tooltip-month">{activePoint.label || activePoint.month}</span>
            <span className="uninova-tooltip-value" suppressHydrationWarning>
              ● {valuePrefix}
              {maxValue <= 10 ? activePoint.value.toFixed(2) : String(activePoint.value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              {valueSuffix}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
