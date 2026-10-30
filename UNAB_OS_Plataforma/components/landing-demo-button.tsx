"use client";

import { useState } from "react";
import { enterDemoSession } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export function LandingDemoButton({
  label = "⚡ Probar Entorno Demo (1-Click)",
  className = "",
  style = {},
}: {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDemoClick() {
    setLoading(true);
    try {
      const res = await enterDemoSession();
      const client = createClient();
      if (res.email && res.password) {
        try {
          await client.auth.signInWithPassword({
            email: res.email,
            password: res.password,
          });
        } catch {
          // Cookie fallback will keep session active
        }
      }
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("uninova_demo", "1");
      }
      window.location.assign("/dashboard");
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("uninova_demo", "1");
      }
      window.location.assign("/dashboard");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDemoClick}
      disabled={loading}
      className={`landing-demo-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "15px 28px",
        backgroundColor: "#0284c7",
        backgroundImage: "linear-gradient(135deg, #0284c7 0%, #16a34a 100%)",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "1rem",
        borderRadius: "12px",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: "0 8px 24px rgba(2, 132, 199, 0.35)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        textDecoration: "none",
        ...style,
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <span>{loading ? "Cargando Entorno Demo..." : label}</span>
    </button>
  );
}
