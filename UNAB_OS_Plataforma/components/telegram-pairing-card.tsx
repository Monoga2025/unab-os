"use client";

import { useState, useTransition } from "react";

import { JarvisHudOrb } from "@/components/jarvis-hud-orb";

export type TelegramPairingStatus = Readonly<{
  linked: boolean;
  telegramUserId: string | null;
  linkedAt: string | null;
  pendingCodeExpiresAt: string | null;
}>;

type CodeResponse = Readonly<{
  code: string;
  command: string;
  expiresAt: string;
}>;

function maskedTelegramId(value: string | null): string {
  if (!value) return "";
  return `••••${value.slice(-4)}`;
}

export function TelegramPairingCard({ initialStatus }: { initialStatus: TelegramPairingStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [code, setCode] = useState<CodeResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/telegram/pairing", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as TelegramPairingStatus | { error?: string } | null;
      if (!response.ok || !body || !("linked" in body)) {
        setMessage((body && "error" in body && body.error) || "No se pudo verificar el enlace.");
        return;
      }
      setStatus(body);
      if (body.linked) setCode(null);
    });
  }

  function generate() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/telegram/pairing", { method: "POST" });
      const body = (await response.json().catch(() => null)) as CodeResponse | { error?: string } | null;
      if (!response.ok || !body || !("code" in body)) {
        setMessage((body && "error" in body && body.error) || "No se pudo generar el código.");
        return;
      }
      setCode(body);
      setStatus((current) => ({ ...current, pendingCodeExpiresAt: body.expiresAt }));
    });
  }

  function unlink() {
    if (!window.confirm("¿Desvincular este chat de Telegram? Los envíos pendientes se cancelarán.")) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/telegram/pairing", { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error || "No se pudo desvincular Telegram.");
        return;
      }
      setCode(null);
      setStatus({ linked: false, telegramUserId: null, linkedAt: null, pendingCodeExpiresAt: null });
    });
  }

  return (
    <div className="jarvis-telegram-pairing-card" style={{ width: "100%" }}>
      {/* 1:1 Aspect Ratio HUD Hologram Loop Container (Pure Transparent Luxury) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "230px",
          aspectRatio: "1 / 1",
          margin: "0 auto 10px auto",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "transparent",
        }}
      >
        {/* Top Telemetry Header */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgb(217, 119, 6)",
            zIndex: 3,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: status.linked ? "rgb(34, 197, 94)" : "rgb(245, 158, 11)",
                boxShadow: status.linked ? "0 0 8px rgb(34, 197, 94)" : "0 0 8px rgb(245, 158, 11)",
              }}
            />
            JARVIS HUD
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.62rem" }}>
            {status.linked ? "EN LÍNEA" : "STANDBY"}
          </span>
        </div>

        {/* Real-time Transparent WebGL / Canvas Luma-Key Orb with Feathered Edges */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "180px",
            height: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <JarvisHudOrb size={180} mode="alpha" />
        </div>

        {/* Subtitle / Status telemetry */}
        <div
          style={{
            fontSize: "0.62rem",
            color: "var(--color-text-muted)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textAlign: "center",
            zIndex: 3,
          }}
        >
          {status.linked ? "SINCRONIZADO CON TELEGRAM" : "LISTO PARA VINCULAR"}
        </div>
      </div>

      {/* Main Telegram Pairing Action Row */}
      <section className="telegram-pairing" aria-labelledby="telegram-pairing-title" style={{ marginTop: 0, paddingTop: "8px" }}>

      {/* Main Connection Controls */}
      <div>
        <span id="telegram-pairing-title">Jarvis en Telegram</span>
        {status.linked ? (
          <strong>Conectado {maskedTelegramId(status.telegramUserId)}</strong>
        ) : (
          <strong>Conecta tu chat privado con Jarvis</strong>
        )}
      </div>
      {status.linked ? (
        <div className="telegram-pairing-actions">
          <button type="button" onClick={refresh} disabled={pending}>
            {pending ? "Verificando…" : "Verificar"}
          </button>
          <button type="button" onClick={unlink} disabled={pending}>
            Desvincular
          </button>
        </div>
      ) : (
        <button type="button" onClick={generate} disabled={pending}>
          {pending ? "Generando…" : code ? "Generar otro" : "Generar código"}
        </button>
      )}
      {code && !status.linked && (
        <div className="telegram-pairing-code">
          <code>{code.code}</code>
          <p>
            En el chat privado con Jarvis envía: <b>{code.command}</b>
          </p>
          <button type="button" onClick={refresh} disabled={pending}>
            Ya lo envié
          </button>
        </div>
      )}
      {!code && !status.linked && status.pendingCodeExpiresAt && (
        <p>Hay un código vigente, pero por seguridad solo se muestra al generarlo. Genera uno nuevo si lo perdiste.</p>
      )}
      {message && (
        <p role="status" className="telegram-pairing-error">
          {message}
        </p>
      )}

      <details style={{ marginTop: "10px", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          💡 ¿Cómo te avisa Jarvis en Telegram?
        </summary>
        <div style={{ marginTop: "8px", padding: "10px", borderRadius: "8px", backgroundColor: "var(--color-bg-subtle)", border: "1px solid var(--color-border)", fontSize: "0.75rem", lineHeight: 1.4 }}>
          <p style={{ margin: "0 0 6px 0", color: "var(--color-text)" }}>
            <strong>🤖 Jarvis (08:00 AM):</strong> “Hoy tienes Parcial en Campus El Jardín con Prof. Martha Jaimes.”
          </p>
          <p style={{ margin: 0, color: "var(--color-text)" }}>
            <strong>⚠️ Jarvis (18:00 PM):</strong> “Faltan 6 horas para la entrega de Circuitos en TEMA Moodle. ¡Evita perder el 15% del corte!”
          </p>
        </div>
      </details>
    </section>
  </div>
  );
}

