"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { directInstitutionalLogin } from "@/app/actions/auth";

export function UniNovaHeader({
  userName = "Daniel Monoga",
  userRole = "Estudiante",
  onSearch,
  onOpenMobileNav,
}: {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  onSearch?: (term: string) => void;
  onOpenMobileNav?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [notificationCount] = useState(3);

  // Check if session email is in localStorage on mount or if logged out
  useEffect(() => {
    try {
      const isLoggedOut = typeof window !== "undefined" && (
        new URLSearchParams(window.location.search).get("auth") === "logout" ||
        localStorage.getItem("uninova_logged_out") === "1"
      );

      if (isLoggedOut) {
        setShowAuthModal(true);
      } else {
        const saved = localStorage.getItem("uninova_user_email");
        if (saved && !document.cookie.includes("uninova_user_email")) {
          document.cookie = `uninova_user_email=${encodeURIComponent(saved)}; max-age=31536000; path=/; sameSite=Lax`;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch?.(val);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = authEmail.trim();
    if (!emailToUse) return;

    setAuthLoading(true);
    setAuthSuccessMsg(null);

    try {
      await directInstitutionalLogin(emailToUse);
      // Persist in localStorage and long-lived cookie (1 year)
      localStorage.setItem("uninova_user_email", emailToUse);
      localStorage.removeItem("uninova_logged_out");
      document.cookie = `uninova_user_email=${encodeURIComponent(emailToUse)}; max-age=31536000; path=/; sameSite=Lax`;
      document.cookie = "uninova_logged_out=; path=/; max-age=0";
      setAuthSuccessMsg(`¡Bienvenido! Sesión guardada y recordada para ${emailToUse}`);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch {
      localStorage.setItem("uninova_user_email", emailToUse);
      localStorage.removeItem("uninova_logged_out");
      document.cookie = `uninova_user_email=${encodeURIComponent(emailToUse)}; max-age=31536000; path=/; sameSite=Lax`;
      document.cookie = "uninova_logged_out=; path=/; max-age=0";
      window.location.href = "/dashboard";
    } finally {
      setAuthLoading(false);
    }
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="uninova-header">
        {/* Mobile menu trigger */}
        <button
          type="button"
          className="uninova-mobile-toggle"
          onClick={onOpenMobileNav}
          aria-label="Abrir menú de navegación"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Global Search Bar with ⌘K badge */}
        <div className="uninova-search-bar">
          <span className="uninova-search-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Buscar asignaturas, docentes, tareas, fórmulas..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="uninova-search-input"
            aria-label="Buscar en Universidad OS"
          />
          <kbd className="uninova-search-kbd">⌘ K</kbd>
        </div>

        {/* Right Header Meta Actions */}
        <div className="uninova-header-actions">
          {/* Notification Bell */}
          <div className="uninova-notif-wrapper">
            <button
              type="button"
              className="uninova-notif-btn"
              aria-label={`Notificaciones académicas, ${notificationCount} pendientes`}
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notificationCount > 0 && (
                <span className="uninova-notif-badge">{notificationCount}</span>
              )}
            </button>
          </div>

          {/* Current Semester Chip */}
          <div className="uninova-semester-chip">
            <span className="uninova-semester-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div className="uninova-semester-info">
              <span className="uninova-semester-title">Semestre 2026-1</span>
              <span className="uninova-semester-subtitle">Ing. Mecatrónica UNAB</span>
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="uninova-profile-wrapper">
            <button
              type="button"
              className="uninova-profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-expanded={showProfileMenu}
              aria-label="Menú de perfil del estudiante"
            >
              <div className="uninova-avatar-initials" aria-hidden="true">
                {initials}
              </div>
              <div className="uninova-profile-info">
                <span className="uninova-user-name">{userName}</span>
                <span className="uninova-user-role">{userRole}</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="uninova-profile-dropdown" role="menu">
                <div className="uninova-profile-header">
                  <div className="uninova-avatar-initials lg">{initials}</div>
                  <div>
                    <strong>{userName}</strong>
                    <small>Ingeniería Mecatrónica · UNAB</small>
                  </div>
                </div>
                <div className="uninova-dropdown-divider" />
                <button
                  type="button"
                  className="uninova-dropdown-item primary-action"
                  role="menuitem"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowAuthModal(true);
                  }}
                >
                  🔑 Iniciar Sesión / Cambiar Cuenta
                </button>
                <Link
                  href="/dashboard?tab=horario"
                  className="uninova-dropdown-item"
                  role="menuitem"
                  onClick={() => setShowProfileMenu(false)}
                >
                  ⏰ Mi Horario Semanal
                </Link>
                <Link
                  href="/materias"
                  className="uninova-dropdown-item"
                  role="menuitem"
                  onClick={() => setShowProfileMenu(false)}
                >
                  🗂️ Mis Asignaturas
                </Link>
                <Link
                  href="/tema"
                  className="uninova-dropdown-item"
                  role="menuitem"
                  onClick={() => setShowProfileMenu(false)}
                >
                  ⚡ Bóveda Moodle TEMA
                </Link>
                <div className="uninova-dropdown-divider" />
                <div className="uninova-dropdown-footer">
                  <SignOutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* LOGIN / SWITCH ACCOUNT POPUP MODAL */}
      {showAuthModal && (
        <div className="uninova-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="uninova-modal-card auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="uninova-modal-header">
              <div className="uninova-auth-modal-title">
                <span className="uninova-brand-badge">U</span>
                <h3>Acceso Institucional UniNova</h3>
              </div>
              <button
                type="button"
                className="uninova-modal-close"
                onClick={() => setShowAuthModal(false)}
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            <p className="uninova-modal-sub">
              Ingresa tu correo institucional UNAB para acceder a tu panel académico y sincronizar tu horario.
            </p>

            {authSuccessMsg ? (
              <div className="uninova-modal-success">
                <span style={{ fontSize: "18px" }}>✅</span>
                <span>{authSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="uninova-modal-form">
                <div className="uninova-auth-field-group">
                  <label htmlFor="auth-email-input" className="uninova-auth-label">
                    <span>📧 Correo Institucional UNAB:</span>
                  </label>
                  <div className="uninova-auth-input-wrapper">
                    <span className="uninova-auth-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L1 7" />
                      </svg>
                    </span>
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      placeholder="user7@example.edu"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="uninova-auth-input"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="uninova-auth-persistence-note">
                  <span aria-hidden="true">🔒</span>
                  <span>
                    <strong>Sesión recordada:</strong> Tu cuenta quedará guardada de forma segura en este navegador.
                  </span>
                </div>

                <div className="uninova-modal-actions">
                  <button
                    type="button"
                    className="uninova-btn-secondary"
                    onClick={() => setShowAuthModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="uninova-btn-primary"
                    disabled={authLoading}
                    style={{ minWidth: "160px" }}
                  >
                    {authLoading ? "Accediendo..." : "Entrar a UniNova →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
