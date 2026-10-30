"use client";

import React from "react";
import { UniNovaStatusPill } from "./uninova-data-table";

export interface QuickProfileData {
  name: string;
  code: string;
  statusLabel: string;
  status: "activo" | "en_riesgo" | "pendiente" | "completado" | "inactivo";
  program: string;
  campus: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}

const DEFAULT_PROFILE: QuickProfileData = {
  name: "Mariana López Torres",
  code: "SOL-2023-4587",
  status: "activo",
  statusLabel: "Activo",
  program: "Ingeniería de Sistemas",
  campus: "Sede Principal / Bogotá",
  email: "user8@example.edu",
  phone: "+57 300 123 4567",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
};

export function UniNovaQuickProfile({
  profile = DEFAULT_PROFILE,
  onAction,
}: {
  profile?: QuickProfileData;
  onAction?: (actionName: string) => void;
}) {
  return (
    <div className="uninova-quick-profile-card">
      <div className="uninova-quick-profile-header">
        <h3 className="uninova-quick-profile-title">Perfil rápido</h3>
        <button
          type="button"
          className="uninova-profile-full-link"
          onClick={() => onAction?.("full_profile")}
        >
          Ver perfil completo <span>→</span>
        </button>
      </div>

      <div className="uninova-quick-profile-body">
        {/* Avatar + Main Info */}
        <div className="uninova-quick-profile-avatar-row">
          <div className="uninova-quick-profile-avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="uninova-quick-profile-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="uninova-profile-fallback">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
          </div>

          <div className="uninova-quick-profile-names">
            <strong className="uninova-quick-profile-name">{profile.name}</strong>
            <span className="uninova-quick-profile-code">{profile.code}</span>
            <div className="uninova-quick-profile-status-wrap">
              <UniNovaStatusPill status={profile.status} label={profile.statusLabel} />
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="uninova-quick-profile-details">
          <div className="uninova-profile-detail-item">
            <span className="uninova-detail-icon">🎓</span>
            <span>{profile.program}</span>
          </div>
          <div className="uninova-profile-detail-item">
            <span className="uninova-detail-icon">🏛️</span>
            <span>{profile.campus}</span>
          </div>
          <div className="uninova-profile-detail-item">
            <span className="uninova-detail-icon">✉️</span>
            <span>{profile.email}</span>
          </div>
          <div className="uninova-profile-detail-item">
            <span className="uninova-detail-icon">📞</span>
            <span>{profile.phone}</span>
          </div>
        </div>

        {/* 4 Action Buttons Matrix */}
        <div className="uninova-profile-actions-grid">
          <button
            type="button"
            className="uninova-profile-action-btn"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = `mailto:${profile.email}`;
              }
              onAction?.("correo");
            }}
            title={`Escribir a ${profile.email}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 7L2 7" />
            </svg>
            <span>Escribir</span>
          </button>

          <button
            type="button"
            className="uninova-profile-action-btn"
            onClick={() => onAction?.("horario")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Horario</span>
          </button>

          <button
            type="button"
            className="uninova-profile-action-btn"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/tema";
              }
              onAction?.("tema");
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>TEMA</span>
          </button>

          <button
            type="button"
            className="uninova-profile-action-btn"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/dashboard?tab=simulador";
              }
              onAction?.("notas");
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Simulador</span>
          </button>
        </div>
      </div>
    </div>
  );
}
