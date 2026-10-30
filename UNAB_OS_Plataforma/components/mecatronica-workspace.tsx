"use client";

import React from "react";
import Link from "next/link";

export function MecatronicaWorkspace() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          padding: "60px 32px",
          textAlign: "center",
          borderRadius: "24px",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          maxWidth: "680px",
          width: "100%",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ fontSize: "3.8rem" }}>🔒</div>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            padding: "5px 14px",
            borderRadius: "20px",
            background: "rgba(239, 68, 68, 0.12)",
            color: "#ef4444",
            border: "1px solid rgba(239, 68, 68, 0.25)",
          }}
        >
          Módulo Bloqueado · Plan Pro
        </span>
        <h1 style={{ margin: "0", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.4px" }}>
          Simulador 2D Mecatrónica (Monoga Engine)
        </h1>
        <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-muted)", lineHeight: 1.6, maxWidth: "520px" }}>
          El motor de simulación cinemática 2D, cálculo de criterios de Grashof (4 barras), análisis de fasores RLC y entrenador interactivo está restringido para la versión Pro. Próximamente disponible.
        </p>
        <Link
          href="/dashboard"
          className="uninova-btn-secondary"
          style={{ marginTop: "12px", textDecoration: "none", padding: "10px 24px" }}
        >
          ← Volver al Panel Principal
        </Link>
      </div>
    </div>
  );
}
