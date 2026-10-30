"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UniNovaLogo } from "./uninova-brand";

export type NavItemKey =
  | "resumen"
  | "horario"
  | "programas"
  | "tareas"
  | "admisiones"
  | "estudiantes"
  | "solicitudes"
  | "docentes"
  | "pagos"
  | "reportes"
  | "entrenador"
  | "admin-users"
  | "recursos"
  | "configuracion";

export interface SidebarNavProps {
  activeTab?: string;
  onSelectTab?: (tab: NavItemKey) => void;
  onCloseMobileNav?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemDef {
  key: NavItemKey;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    key: "resumen",
    label: "Inicio",
    href: "/dashboard?tab=resumen",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "horario",
    label: "Mi Horario",
    href: "/dashboard?tab=horario",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: "programas",
    label: "Mis Asignaturas",
    href: "/materias",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "tareas",
    label: "Tareas y Entregas",
    href: "/dashboard?tab=tareas",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "admisiones",
    label: "Parciales & Fechas",
    href: "/evaluaciones",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "estudiantes",
    label: "Calculadora de Notas",
    href: "/dashboard?tab=simulador",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="16" y1="14" x2="16" y2="18" />
        <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
      </svg>
    ),
  },
  {
    key: "solicitudes",
    label: "🔒 Simulador 2D",
    href: "/mecatronica",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: "docentes",
    label: "🔒 Docentes & Salones",
    href: "/dashboard?tab=docentes",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "pagos",
    label: "🔒 Bóveda Moodle",
    href: "/tema",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "reportes",
    label: "Rendimiento & PGA",
    href: "/progress",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    key: "entrenador",
    label: "Entrenador",
    href: "/entrenador",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 2 8l10 5 10-5-10-5z" />
        <path d="M6 10v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6" />
        <line x1="22" y1="8" x2="22" y2="14" />
      </svg>
    ),
  },
  {
    key: "admin-users",
    label: "Radar de Registros",
    href: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "recursos",
    label: "Recursos UNAB",
    href: "/dashboard?tab=recursos",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "configuracion",
    label: "Configuración",
    href: "/dashboard?tab=configuracion",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function UniNovaSidebar({
  activeTab,
  onSelectTab,
  onCloseMobileNav,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeKey: NavItemKey = React.useMemo(() => {
    if (pathname.startsWith("/materias")) return "programas";
    if (pathname.startsWith("/evaluaciones")) return "admisiones";
    if (pathname.startsWith("/tema") || pathname.startsWith("/study")) return "pagos";
    if (pathname.startsWith("/entrenador")) return "entrenador";
    if (pathname.startsWith("/tutor") || pathname.startsWith("/progress")) return "reportes";
    if (pathname.startsWith("/mecatronica")) return "solicitudes";
    if (pathname === "/dashboard" || pathname === "/") {
      const tab = searchParams?.get("tab");
      if (tab === "horario") return "horario";
      if (tab === "tareas") return "tareas";
      if (tab === "simulador") return "estudiantes";
      if (tab === "docentes") return "docentes";
      if (tab === "recursos") return "recursos";
      if (tab === "configuracion") return "configuracion";
      if (activeTab && activeTab !== "resumen") return activeTab as NavItemKey;
      return "resumen";
    }
    return (activeTab as NavItemKey) || "resumen";
  }, [activeTab, pathname, searchParams]);

  return (
    <aside className={`uninova-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Brand Header with Collapse Button */}
      <div className="uninova-sidebar-brand" style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", gap: "6px" }}>
        <Link
          href="/dashboard"
          className="uninova-brand-link"
          onClick={() => {
            onSelectTab?.("resumen");
            onCloseMobileNav?.();
          }}
          aria-label="UniNova, ir al inicio"
        >
          <UniNovaLogo variant={isCollapsed ? "mark" : "full"} size="md" />
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            className="uninova-sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Desplegar menú lateral (expandir)" : "Plegar menú lateral (más espacio)"}
            aria-label={isCollapsed ? "Desplegar menú lateral" : "Plegar menú lateral"}
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              width: "28px",
              height: "28px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#475569",
              fontSize: "12px",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            {isCollapsed ? "▶" : "◀"}
          </button>
        )}
      </div>

      {/* Main Navigation List */}
      <nav className="uninova-nav" aria-label="Navegación del sistema UniNova">
        {NAV_ITEMS.map((item) => {
          const isSelected = activeKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`uninova-nav-item ${isSelected ? "active" : ""}`}
              onClick={(e) => {
                if (onSelectTab) {
                  e.preventDefault();
                  onSelectTab(item.key);
                }
                onCloseMobileNav?.();
              }}
              title={isCollapsed ? item.label : undefined}
              aria-current={isSelected ? "page" : undefined}
            >
              <span className="uninova-nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="uninova-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Flexible Spacer */}
      <div className="uninova-sidebar-spacer" />

      {/* Purpose Banner Card */}
      {!isCollapsed && (
        <div className="uninova-purpose-card">
          <div className="uninova-purpose-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="uninova-purpose-content">
            <h4 className="uninova-purpose-title">Tu meta, nuestro propósito</h4>
            <p className="uninova-purpose-desc">Disciplina hoy, resultados mañana.</p>
          </div>
          <button
            type="button"
            className="uninova-purpose-arrow-btn"
            aria-label="Ver propósito"
            onClick={() => {
              onSelectTab?.("resumen");
              onCloseMobileNav?.();
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
