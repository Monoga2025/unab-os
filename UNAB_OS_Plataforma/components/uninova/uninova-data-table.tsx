"use client";

import React, { useState } from "react";

export type TableStatusType =
  | "activo"
  | "en_riesgo"
  | "pendiente"
  | "completado"
  | "en_revision"
  | "aprobada"
  | "inactivo"
  | "abierta"
  | "resuelto";

export interface TableRowData {
  id: string;
  code?: string;
  avatarUrl?: string;
  avatarFallback: string;
  primaryText: string;
  secondaryText?: string;
  category: string;
  detailText?: string;
  status: TableStatusType;
  statusLabel: string;
  paymentStatus?: "al_dia" | "pendiente" | "al_dia_val";
  paymentLabel?: string;
  dateOrValue?: string;
}

const DEFAULT_ROWS: TableRowData[] = [
  {
    id: "1",
    code: "UNAB-CALC-01",
    avatarFallback: "MC",
    primaryText: "Parcial de Cálculo (Integrales Triples & EDO)",
    secondaryText: "Prof. Martha Cecilia Jaimes",
    category: "Ciencias Básicas",
    detailText: "Parcial individual presencial · Aula 302",
    status: "en_riesgo",
    statusLabel: "Parcial Lun 21 Sep",
    paymentStatus: "pendiente",
    paymentLabel: "Prioridad Alta",
    dateOrValue: "21 sep. 2026",
  },
  {
    id: "2",
    code: "UNAB-CIR-02",
    avatarFallback: "RD",
    primaryText: "Entrega de Portafolio de Circuitos Eléctricos",
    secondaryText: "Prof. Ricardo Duarte",
    category: "Ingeniería Mecatrónica",
    detailText: "Subida digital en plataforma TEMA Moodle",
    status: "pendiente",
    statusLabel: "Entrega Mar 22 Sep",
    paymentStatus: "al_dia",
    paymentLabel: "TEMA Sync",
    dateOrValue: "22 sep. 2026",
  },
  {
    id: "3",
    code: "UNAB-OND-03",
    avatarFallback: "GT",
    primaryText: "Parcial de Física: Ondas y Partículas (M.A.S.)",
    secondaryText: "Prof. Gabriel Torres",
    category: "Ingeniería Mecatrónica",
    detailText: "Laboratorio y examen teórico de ondas mecánicas",
    status: "en_riesgo",
    statusLabel: "Parcial Mié 23 Sep",
    paymentStatus: "pendiente",
    paymentLabel: "Prioridad Alta",
    dateOrValue: "23 sep. 2026",
  },
  {
    id: "4",
    code: "UNAB-CIR-04",
    avatarFallback: "RD",
    primaryText: "Taller: 25 Ejercicios de Circuitos (RLC & Fasores)",
    secondaryText: "Prof. Ricardo Duarte",
    category: "Ingeniería Mecatrónica",
    detailText: "Solucionario completo paso a paso con diagramas",
    status: "activo",
    statusLabel: "Taller en curso",
    paymentStatus: "al_dia",
    paymentLabel: "25 Ejercicios",
    dateOrValue: "24 sep. 2026",
  },
  {
    id: "5",
    code: "UNAB-MEC-05",
    avatarFallback: "HO",
    primaryText: "Síntesis de dos posiciones (Mecanismo 4 barras)",
    secondaryText: "Prof. Hernán Ospina",
    category: "Ingeniería Mecatrónica",
    detailText: "Trazado gráfico y cinemático de eslabonamientos",
    status: "activo",
    statusLabel: "Entrega previa",
    paymentStatus: "al_dia",
    paymentLabel: "CAD & Planos",
    dateOrValue: "24 sep. 2026",
  },
  {
    id: "6",
    code: "UNAB-MEC-06",
    avatarFallback: "HO",
    primaryText: "Parcial de Mecanismos (Síntesis y Cinemática)",
    secondaryText: "Prof. Hernán Ospina",
    category: "Ingeniería Mecatrónica",
    detailText: "Evaluación práctica de mecanismos articulados",
    status: "en_riesgo",
    statusLabel: "Parcial Vie 25 Sep",
    paymentStatus: "pendiente",
    paymentLabel: "Prioridad Alta",
    dateOrValue: "25 sep. 2026",
  },
];

export function UniNovaStatusPill({
  status,
  label,
}: {
  status: TableStatusType;
  label: string;
}) {
  return (
    <span className={`uninova-status-pill uninova-status-${status}`}>
      {status === "activo" || status === "completado" || status === "aprobada" || status === "resuelto" ? (
        <span className="uninova-pill-dot" aria-hidden="true" />
      ) : status === "en_riesgo" ? (
        <span className="uninova-pill-icon" aria-hidden="true">⚠️</span>
      ) : status === "pendiente" ? (
        <span className="uninova-pill-icon" aria-hidden="true">⏳</span>
      ) : null}
      <span>{label}</span>
    </span>
  );
}

export function UniNovaDataTable({
  title = "Entregas y Parciales",
  actionLabel = "Ver todas →",
  onActionClick,
  showFilters = true,
  searchPlaceholder = "Buscar por nombre, docente o código...",
  rows = DEFAULT_ROWS,
  totalRows,
  onRowClick,
}: {
  title?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  showFilters?: boolean;
  searchPlaceholder?: string;
  rows?: TableRowData[];
  totalRows?: number;
  onRowClick?: (row: TableRowData) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredRows = rows.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.primaryText.toLowerCase().includes(term) ||
      (r.code && r.code.toLowerCase().includes(term)) ||
      r.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="uninova-table-card">
      <div className="uninova-table-card-header">
        <h3 className="uninova-table-card-title">{title}</h3>
        {actionLabel && (
          <button
            type="button"
            className="uninova-table-action-link"
            onClick={onActionClick}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="uninova-table-filter-bar">
          <div className="uninova-table-search-field">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="uninova-table-search-icon"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="uninova-table-search-input"
            />
          </div>

          <div className="uninova-filter-dropdowns">
            <div className="uninova-select-chip">
              <span>Todos los programas</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="uninova-select-chip">
              <span>Todos los semestres</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="uninova-select-chip">
              <span>Todos los estados</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <button type="button" className="uninova-filter-toggle-btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filtros</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Component */}
      <div className="uninova-table-scroll-wrap">
        <table className="uninova-table">
          <thead>
            <tr>
              <th className="uninova-th-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.size === rows.length && rows.length > 0}
                  onChange={toggleSelectAll}
                  aria-label="Seleccionar todas las filas"
                  className="uninova-checkbox"
                />
              </th>
              <th>Código</th>
              <th>Asignatura / Actividad</th>
              <th>Docente / Área</th>
              <th>Salón / Ubicación</th>
              <th>Estado</th>
              <th>Fecha / Entrega</th>
              <th className="uninova-th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isSelected = selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={isSelected ? "is-selected-row" : ""}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  <td className="uninova-td-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(row.id)}
                      aria-label={`Seleccionar ${row.primaryText}`}
                      className="uninova-checkbox"
                    />
                  </td>
                  <td className="uninova-td-code">
                    <span className="uninova-code-badge">{row.code || row.id}</span>
                  </td>
                  <td className="uninova-td-person">
                    <div className="uninova-person-cell">
                      <div className="uninova-person-avatar">
                        {row.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.avatarUrl}
                            alt={row.primaryText}
                            className="uninova-avatar-img"
                          />
                        ) : (
                          <span className="uninova-avatar-fallback">{row.avatarFallback}</span>
                        )}
                      </div>
                      <div className="uninova-person-meta">
                        <strong className="uninova-person-primary">{row.primaryText}</strong>
                        {row.secondaryText && (
                          <span className="uninova-person-secondary">{row.secondaryText}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="uninova-td-program">
                    <span className="uninova-text-truncated">{row.category}</span>
                  </td>
                  <td className="uninova-td-detail">
                    <span className="uninova-text-subtle">{row.detailText || "—"}</span>
                  </td>
                  <td className="uninova-td-status">
                    <UniNovaStatusPill status={row.status} label={row.statusLabel} />
                  </td>
                  <td className="uninova-td-payment">
                    {row.paymentStatus ? (
                      <span className={`uninova-payment-pill is-${row.paymentStatus}`}>
                        {row.paymentLabel || row.dateOrValue}
                      </span>
                    ) : (
                      <span className="uninova-date-text">{row.dateOrValue || "—"}</span>
                    )}
                  </td>
                  <td className="uninova-td-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="uninova-row-action-btn"
                      aria-label={`Acciones para ${row.primaryText}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="uninova-table-pagination">
        <span className="uninova-pagination-counter">
          Mostrando {filteredRows.length} de {totalRows ?? filteredRows.length} registros del semestre
        </span>

        <div className="uninova-pagination-controls">
          <button
            type="button"
            className="uninova-page-btn uninova-page-prev"
            disabled={activePage === 1}
            onClick={() => setActivePage((p) => Math.max(1, p - 1))}
            aria-label="Página anterior"
          >
            ‹
          </button>

          <button
            type="button"
            className="uninova-page-btn is-active"
          >
            1
          </button>

          <button
            type="button"
            className="uninova-page-btn uninova-page-next"
            disabled
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="uninova-page-size-selector">
          <span>{pageSize} por página</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}
