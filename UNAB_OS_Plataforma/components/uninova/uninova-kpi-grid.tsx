"use client";

import React from "react";

export interface KpiCardData {
  id: string;
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  comparisonText?: string;
  iconColor?: "blue" | "cyan" | "green" | "amber" | "rose" | "purple";
  icon: React.ReactNode;
}

export function UniNovaKpiCard({ data }: { data: KpiCardData }) {
  const isPositive = data.deltaType === "positive" || (!data.deltaType && data.delta?.startsWith("+"));
  const isNegative = data.deltaType === "negative" || (!data.deltaType && data.delta?.startsWith("-"));

  return (
    <div className="uninova-kpi-card">
      <div className={`uninova-kpi-icon-wrap uninova-kpi-icon-${data.iconColor || "blue"}`}>
        {data.icon}
      </div>

      <div className="uninova-kpi-content">
        <span className="uninova-kpi-title">{data.title}</span>
        <strong className="uninova-kpi-value">{data.value}</strong>

        {data.delta && (
          <div className="uninova-kpi-delta-row">
            <span
              className={`uninova-kpi-delta ${
                isPositive ? "is-positive" : isNegative ? "is-negative" : "is-neutral"
              }`}
            >
              {isPositive && "↑ "}
              {isNegative && "↓ "}
              {data.delta}
            </span>
            {data.comparisonText && (
              <span className="uninova-kpi-comparison">{data.comparisonText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function UniNovaKpiGrid({
  items,
  columns = 4,
}: {
  items: KpiCardData[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <section
      className={`uninova-kpi-grid uninova-kpi-cols-${columns}`}
      aria-label="Indicadores clave de rendimiento"
    >
      {items.map((item) => (
        <UniNovaKpiCard key={item.id} data={item} />
      ))}
    </section>
  );
}
