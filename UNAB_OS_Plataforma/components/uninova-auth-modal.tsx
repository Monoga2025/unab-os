"use client";

import React, { useState } from "react";
import { directInstitutionalLogin } from "@/app/actions/auth";

export interface UniNovaAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (email: string) => void;
}

export function UniNovaAuthModal({ isOpen, onClose, onSuccess }: UniNovaAuthModalProps) {
  const [authUsername, setAuthUsername] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes("@")) {
      setAuthUsername(val.split("@")[0].trim().toLowerCase());
    } else {
      setAuthUsername(val.trim().toLowerCase());
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = authUsername.trim();
    if (!rawInput) return;

    const emailToUse = rawInput.includes("@") ? rawInput.toLowerCase() : `${rawInput.toLowerCase()}@unab.edu.co`;

    setAuthLoading(true);
    setAuthSuccessMsg(null);

    try {
      await directInstitutionalLogin(emailToUse);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("uninova_user_email", emailToUse);
        window.localStorage.removeItem("uninova_logged_out");
      }
      setAuthSuccessMsg(`¡Bienvenido! Sesión guardada para ${emailToUse}`);
      onSuccess?.(emailToUse);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("uninova_user_email", emailToUse);
        window.localStorage.removeItem("uninova_logged_out");
        window.location.href = "/dashboard";
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="uninova-modal-backdrop" onClick={onClose}>
      <div className="uninova-modal-card auth-popup" onClick={(e) => e.stopPropagation()}>
        <div className="uninova-modal-header">
          <div className="uninova-auth-modal-title">
            <span className="uninova-brand-badge">U</span>
            <h3 style={{ color: "#ffffff", fontWeight: 800, margin: 0 }}>Acceso Institucional UniNova</h3>
          </div>
          <button
            type="button"
            className="uninova-modal-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        <p className="uninova-modal-sub">
          Ingresa tu usuario institucional UNAB para acceder a tu panel académico y sincronizar tu horario.
        </p>

        {authSuccessMsg ? (
          <div className="uninova-modal-success">
            <span style={{ fontSize: "18px" }}>✅</span>
            <span>{authSuccessMsg}</span>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="uninova-modal-form">
            <div className="uninova-auth-field-group">
              <label htmlFor="app-shell-auth-email" className="uninova-auth-label">
                <span>📧 Usuario Institucional UNAB:</span>
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#0f172a",
                  border: "1.5px solid rgba(56, 189, 248, 0.45)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              >
                <input
                  id="app-shell-auth-email"
                  type="text"
                  required
                  placeholder="tu_usuario (ej. c.perez)"
                  value={authUsername}
                  onChange={handleInputChange}
                  autoFocus
                  style={{
                    flex: 1,
                    height: "46px",
                    padding: "0 14px",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    padding: "0 12px",
                    height: "46px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(56, 189, 248, 0.12)",
                    borderLeft: "1.5px solid rgba(56, 189, 248, 0.35)",
                    color: "#38bdf8",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  @unab.edu.co
                </div>
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
                onClick={onClose}
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
  );
}
