"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TemaConnectionForm({ connected, lastSyncedAt, usernameHint }: { connected: boolean; lastSyncedAt: string | null; usernameHint: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(!connected);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/tema/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: values.get("username"), password: values.get("password") }) });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible conectar.");
      form.reset();
      setState("success");
      setMessage(payload.message || "TEMA conectado.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No fue posible conectar.");
    }
  }

  return (
    <section className="tema-connection" aria-labelledby="tema-connection-title" style={{ padding: "20px", borderRadius: "16px", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <p className="section-label" style={{ margin: 0, color: "var(--color-primary)", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase" }}>Sincronización Oficial Moodle</p>
          <h2 id="tema-connection-title" style={{ margin: "4px 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text)" }}>
            {connected ? "Moodle TEMA Conectado" : "Conecta tu Cuenta de Moodle TEMA UNAB"}
          </h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-muted)", maxWidth: "560px", lineHeight: 1.45 }}>
            {connected
              ? `Cuenta ${usernameHint || "verificada"}. ${lastSyncedAt ? `Última sincronización: ${new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }).format(new Date(lastSyncedAt))}.` : "Sincronización inicial en curso."}`
              : "Ingresa tus credenciales de la UNAB. La conexión se realiza directamente a través de la API móvil oficial de Moodle para descargar tus talleres y fechas."}
          </p>
        </div>

        {/* Portal Oficial Directo */}
        <a
          href="https://tema.unab.edu.co"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "rgba(217, 119, 6, 0.12)",
            color: "rgb(180, 83, 9)",
            border: "1px solid rgba(217, 119, 6, 0.3)",
            fontSize: "0.78rem",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          🌐 Abrir Moodle Oficial (tema.unab.edu.co) ↗
        </a>
      </div>

      {connected && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-subtle)",
            color: "var(--color-text)",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cambiar o actualizar conexión
        </button>
      ) : (
        <form onSubmit={submit} autoComplete="on" style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "420px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text)" }}>
            <span>Usuario UNAB (ej. dmonoga)</span>
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={160}
              placeholder="tu_usuario_unab"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-subtle)",
                color: "var(--color-text)",
                fontSize: "0.85rem",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text)" }}>
            <span>Contraseña UNAB</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={500}
              placeholder="••••••••"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-subtle)",
                color: "var(--color-text)",
                fontSize: "0.85rem",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                fontSize: "0.80rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {state === "sending" ? "Verificando con Moodle UNAB…" : "Conectar y Sincronizar TEMA"}
            </button>
            {connected && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  fontSize: "0.80rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {message && (
        <p
          className={`tema-connection-message ${state}`}
          role={state === "error" ? "alert" : "status"}
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "0.78rem",
            fontWeight: 600,
            background: state === "error" ? "rgba(220, 38, 38, 0.12)" : "rgba(34, 197, 94, 0.12)",
            color: state === "error" ? "rgb(220, 38, 38)" : "rgb(22, 163, 74)",
          }}
        >
          {message}
        </p>
      )}
    </section>
  );
}
