"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { MAX_HISTORY_TURNS } from "@/lib/entrenador/limits";

type ChatRole = "user" | "entrenador";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

let messageSequence = 0;

function nextMessageId(): string {
  messageSequence += 1;
  return `entrenador-${Date.now()}-${messageSequence}`;
}

export function EntrenadorWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  function clearConversation() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const priorHistory = messages
      .slice(-MAX_HISTORY_TURNS)
      .map((message) => ({ role: message.role, content: message.content }));
    setMessages((current) => [...current, { id: nextMessageId(), role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/entrenador", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: priorHistory }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; reply?: string };

      if (typeof result.reply === "string" && result.reply.trim()) {
        // On bridge failure the API still returns an honest Spanish reply.
        setMessages((current) => [
          ...current,
          { id: nextMessageId(), role: "entrenador", content: result.reply!.trim() },
        ]);
        return;
      }
      throw new Error("No se pudo obtener una respuesta del entrenador.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const canSend = input.trim().length > 0 && !isSending;

  return (
    <main className="entrenador-main">
      <header className="entrenador-header">
        <div>
          <p className="dashboard-kicker">Entrenador de parciales</p>
          <h1>Entrenador</h1>
          <p>Pegá el enunciado o preguntá lo que necesites. Las fórmulas se muestran renderizadas con LaTeX.</p>
        </div>
        <button className="entrenador-secondary" type="button" onClick={clearConversation} disabled={!messages.length && !input}>
          Limpiar
        </button>
      </header>

      <section className="entrenador-chat entrenador-panel" aria-labelledby="entrenador-chat-title">
        <h2 className="sr-only" id="entrenador-chat-title">Conversación con el entrenador</h2>

        <div
          className="entrenador-messages"
          role="log"
          tabIndex={0}
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={isSending}
          aria-label="Historial de mensajes del entrenador"
        >
          {!messages.length && (
            <div className="entrenador-welcome">
              <h3>¿Qué vas a repasar hoy?</h3>
              <p>Escribí un ejercicio, una duda de método o una fórmula. El entrenador responde con procedimiento, no con motivación.</p>
            </div>
          )}

          {messages.map((message) => (
            <article
              className={`entrenador-message ${message.role}`}
              key={message.id}
              aria-label={message.role === "entrenador" ? "Respuesta del entrenador" : "Tu mensaje"}
            >
              <span className="entrenador-avatar" aria-hidden="true">{message.role === "entrenador" ? "E" : "TÚ"}</span>
              <div className="entrenador-message-body">
                <ChatMarkdown text={message.content} />
              </div>
            </article>
          ))}

          {isSending && (
            <p className="entrenador-thinking" role="status">
              <span aria-hidden="true" />Pensando…
            </p>
          )}
          <div ref={logEndRef} />
        </div>

        <form className="entrenador-composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="entrenador-input">Mensaje para el entrenador</label>
          <textarea
            id="entrenador-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={4000}
            rows={3}
            placeholder="Escribí el enunciado o tu duda. Enter envía, Shift+Enter hace salto de línea."
            disabled={isSending}
            aria-describedby="entrenador-composer-help"
          />
          <div className="entrenador-composer-actions">
            <span id="entrenador-composer-help">Enter envía · Shift+Enter salto de línea</span>
            <button className="entrenador-primary" type="submit" disabled={!canSend}>
              {isSending ? "Pensando…" : "Enviar"}
            </button>
          </div>
        </form>

        {error && <p className="entrenador-error-message" role="alert">{error}</p>}
      </section>
    </main>
  );
}
