"use client";

import { useState, useTransition } from "react";
import {
  resolveJarvisMaterialRequest,
  sendStudyMaterialWithJarvis,
  type JarvisMaterialOption,
} from "@/app/actions/jarvis";

export function JarvisCommand() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<JarvisMaterialOption[]>([]);
  const [message, setMessage] = useState("Dime una materia o tema; yo busco el material oficial verificado.");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    startTransition(async () => {
      const result = await resolveJarvisMaterialRequest(query);
      setMatches(result.matches);
      setMessage(
        result.kind === "none"
          ? "No encontré un PDF descargado y verificable. Prueba con el nombre de la materia o del tema."
          : result.kind === "single"
          ? "Encontré este material oficial listo para enviar a Telegram."
          : "Encontré varias opciones; elige la que deseas estudiar con Jarvis."
      );
    });
  }

  return (
    <details className="jarvis-command">
      <summary>
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "6px", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#ffffff", fontWeight: "800", fontSize: "11px" }}>J</span>
        <strong>Pídele a Jarvis</strong>
        <small>Buscar y enviar material a Telegram</small>
      </summary>
      <div className="jarvis-command-popover">
        <form onSubmit={submit} className="jarvis-command-search">
          <label htmlFor="jarvis-command-query">¿Qué necesitas estudiar hoy?</label>
          <div>
            <input
              id="jarvis-command-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. Bernoulli, Ecuaciones, Ondas..."
              maxLength={180}
            />
            <button disabled={pending || !query.trim()}>
              {pending ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </form>
        <p role="status">{message}</p>
        {matches.length > 0 && (
          <ul>
            {matches.map((match) => (
              <li key={match.candidateId}>
                <div>
                  <strong>{match.title}</strong>
                  <small>
                    {match.subject} · {match.topic}
                  </small>
                </div>
                <form action={sendStudyMaterialWithJarvis}>
                  <input type="hidden" name="candidateId" value={match.candidateId} />
                  <button type="submit">Enviar a Telegram</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <small className="jarvis-command-note">
          Jarvis envía el PDF oficial y el prompt estructurado a tu Telegram para que lo estudies con ChatGPT.
        </small>
      </div>
    </details>
  );
}
