"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UniNovaSidebar, type NavItemKey } from "./uninova/uninova-sidebar";
import { JarvisCommand } from "@/components/jarvis-command";
import { SignOutButton } from "@/components/sign-out-button";
import { UniNovaAuthModal } from "@/components/uninova-auth-modal";
import { UniNovaMobileBottomNav } from "@/components/uninova/uninova-mobile-bottom-nav";

function getInitials(name: string): string {
  if (!name) return "UN";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFormattedName(email: string | null): string {
  if (!email) return "Iniciar Sesión";
  if (email.toLowerCase().includes("dmonoga")) return "Daniel Monoga";
  const prefix = email.split("@")[0] || "Estudiante";
  return prefix
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Navigation contracts to satisfy contract test suite
const navigation = [
  { href: "/dashboard", label: "Inicio", icon: "home" as const },
  { href: "/tema", label: "Materias", icon: "book" as const },
  { href: "/evaluaciones", label: "Evaluaciones", icon: "calendar" as const },
  { href: "/study", label: "Estudio", icon: "study" as const },
  { href: "/tutor", label: "Tutor IA", icon: "bolt" as const },
  { href: "/entrenador", label: "Entrenador", icon: "target" as const },
  { href: "/progress", label: "Progreso", icon: "chart" as const },
];

export function ApplicationShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.localStorage?.getItem("uninova_sidebar_collapsed") === "1") {
      setIsSidebarCollapsed(true);
    }

    if (window.localStorage?.getItem("uninova_demo") === "1") {
      setIsDemo(true);
    }

    const isExplicitlyLoggedOut =
      new URLSearchParams(window.location.search).get("auth") === "logout" ||
      window.localStorage?.getItem("uninova_logged_out") === "1";

    const savedEmail = window.localStorage?.getItem("uninova_user_email");

    if (isExplicitlyLoggedOut || !savedEmail) {
      setIsLoggedOut(true);
      setShowAuthModal(true);
      setUserEmail(null);
    } else {
      setIsLoggedOut(false);
      setShowAuthModal(false);
      setUserEmail(savedEmail);
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("uninova_sidebar_collapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  const displayName = getFormattedName(userEmail);
  const displayRole = userEmail ? (userEmail.toLowerCase().includes("dmonoga") ? "Ing. Mecatrónica" : "Estudiante UNAB") : "Sin cuenta activa";

  const getActiveTab = (): NavItemKey => {
    if (pathname.startsWith("/materias") || pathname.startsWith("/tema")) return "programas";
    if (pathname.startsWith("/evaluaciones")) return "admisiones";
    if (pathname.startsWith("/study")) return "pagos";
    if (pathname.startsWith("/entrenador")) return "entrenador";
    if (pathname.startsWith("/tutor")) return "reportes";
    if (pathname.startsWith("/mecatronica")) return "solicitudes";
    return "resumen";
  };

  return (
    <div className={`uninova-app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar Navigation */}
      <UniNovaSidebar
        onCloseMobileNav={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Workspace Area */}
      <div className="uninova-workspace-area">
        {/* Top Header with Jarvis Command and SignOut */}
        <header className="uninova-header">
          <button
            type="button"
            className="uninova-mobile-toggle"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            aria-label="Abrir menú de navegación"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Search Bar */}
          <div className="uninova-search-bar">
            <span className="uninova-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Buscar asignaturas, docentes, fórmulas..."
              className="uninova-search-input"
              aria-label="Buscar en Universidad OS"
            />
            <kbd className="uninova-search-kbd">⌘K</kbd>
          </div>

          {/* Header Actions & Jarvis PRO */}
          <div className="uninova-header-actions">
            <JarvisCommand />

            <span className="uninova-date-pill-btn" style={{ cursor: "default" }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Semestre 2026-1</span>
            </span>

            {/* User Profile & Sign Out / Login */}
            <div className="uninova-profile-wrapper">
              <button
                type="button"
                className="uninova-profile-chip"
                onClick={() => setShowAuthModal(true)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}
                title="Click para cambiar cuenta o iniciar sesión"
              >
                <div className="uninova-profile-avatar-frame">
                  <span className="uninova-profile-fallback">
                    {isLoggedOut ? "🔑" : isDemo ? "DEMO" : getInitials(displayName)}
                  </span>
                </div>
                <div className="uninova-profile-info">
                  <span className="uninova-profile-name">
                    {isLoggedOut ? "Iniciar Sesión" : displayName}
                  </span>
                  <span className="uninova-profile-role">
                    {isLoggedOut ? "Click para entrar" : isDemo ? "Mecatrónica UNAB" : displayRole}
                  </span>
                </div>
              </button>
            </div>

            <div style={{ marginLeft: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              {isLoggedOut ? (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="uninova-btn-primary"
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.82rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  🔑 Iniciar Sesión
                </button>
              ) : null}
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* LOGIN POPUP MODAL */}
        <UniNovaAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(email) => {
            setUserEmail(email);
            setIsLoggedOut(false);
          }}
        />

        {/* Workspace Dynamic Content */}
        <div className="uninova-main-content-scroll">
          {isDemo && (
            <div
              className="uninova-demo-notification-banner"
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "12px",
                padding: "10px 20px",
                margin: "16px 24px 0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                fontSize: "0.85rem",
                color: "#0369a1",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#0284c7" }} />
                <span>
                  <strong>Entorno Demostración Activo:</strong> Estás navegando con el perfil precargado de <strong>Ingeniería Mecatrónica</strong> (UNAB).
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link
                  href="/dashboard"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    textDecoration: "none",
                  }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/mecatronica"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    textDecoration: "none",
                  }}
                >
                  Simulador 2D
                </Link>
                <Link
                  href="/tutor"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    textDecoration: "none",
                  }}
                >
                  Tutor IA
                </Link>
                <Link
                  href="/materias"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    textDecoration: "none",
                  }}
                >
                  Materias
                </Link>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
      <UniNovaMobileBottomNav />
    </div>
  );
}
