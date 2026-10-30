"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type State = "idle" | "confirming" | "pending" | "success" | "error";

export function TemaDisconnectButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function disconnect() {
    setState("pending");
    setMessage("");
    try {
      const response = await fetch("/api/tema/disconnect", { method: "DELETE" });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible desconectar TEMA.");
      setState("success");
      setMessage(payload.message || "TEMA quedó desconectado.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No fue posible desconectar TEMA.");
    }
  }

  if (!connected && state !== "success") return null;
  if (!connected || state === "success") {
    return <p className="tema-disconnect-result" role="status">{message}</p>;
  }

  return <section className="tema-disconnect" aria-label="Desconectar cuenta TEMA">
    {state === "confirming" ? <>
      <p><strong>¿Desconectar TEMA?</strong> Se eliminará el token cifrado y se detendrán las sincronizaciones. Tu última captura académica se conservará.</p>
      <div>
        <button type="button" className="danger" onClick={disconnect}>Sí, desconectar</button>
        <button type="button" onClick={() => setState("idle")}>Cancelar</button>
      </div>
    </> : <button type="button" onClick={() => setState("confirming")} disabled={state === "pending"}>
      {state === "pending" ? "Desconectando…" : "Desconectar TEMA"}
    </button>}
    {message && <p className="tema-disconnect-result error" role="alert">{message}</p>}
  </section>;
}
