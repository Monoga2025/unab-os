"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type ObjectiveView = { id: string; title: string };
type DocumentView = { id: string; fileName: string; mimeType: string };
type SessionView = { id: string; title: string; startedAt: string | null };
type AttemptView = { id: string; objectiveId: string; createdAt: string };
type TutorMode = "concept" | "exercise";
type ConversationView = {
  id: string;
  title: string;
  objectiveId: string | null;
  documentId: string | null;
  studySessionId: string | null;
  status: string;
  updatedAt: string;
};
type MessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  position: number;
  responseMetadata: unknown;
  createdAt: string;
};
type Recommendation = {
  evidenceSummary?: string;
  confidence?: string;
  observedMasterySignal?: string;
  suggestedNextAction?: string;
  recommendedTopic?: string;
};

type TutorWorkspaceProps = {
  objectives: ObjectiveView[];
  documents: DocumentView[];
  sessions: SessionView[];
  attempts: AttemptView[];
  conversations: ConversationView[];
  selectedConversationId: string | null;
  initialMessages: MessageView[];
};

const actionLabels: Record<string, string> = {
  continue_topic: "Continuar con el tema",
  practice: "Practicar de forma independiente",
  review: "Repasar conceptos",
  switch_topic: "Cambiar de tema",
  break: "Hacer una pausa",
};

function asRecommendation(value: unknown): Recommendation | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Recommendation : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function BoltIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PanelTitle({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return <div><p className="section-label">{label}</p><h2 id={id}>{children}</h2></div>;
}

export function TutorWorkspace(props: TutorWorkspaceProps) {
  const router = useRouter();
  const initialSelectedConversation = props.conversations.find((conversation) => conversation.id === props.selectedConversationId) ?? null;
  const [conversationId, setConversationId] = useState<string | null>(props.selectedConversationId);
  const [objectiveId, setObjectiveId] = useState(initialSelectedConversation?.objectiveId ?? props.objectives[0]?.id ?? "");
  const [documentId, setDocumentId] = useState(initialSelectedConversation?.documentId ?? "");
  const [studySessionId, setStudySessionId] = useState(initialSelectedConversation?.studySessionId ?? "");
  const [mode, setMode] = useState<TutorMode>("concept");
  const [attemptId, setAttemptId] = useState("");
  const [messages, setMessages] = useState(props.initialMessages);
  const [request, setRequest] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const selected = props.conversations.find((conversation) => conversation.id === props.selectedConversationId) ?? null;
    setConversationId(props.selectedConversationId);
    setObjectiveId(selected?.objectiveId ?? props.objectives[0]?.id ?? "");
    setDocumentId(selected?.documentId ?? "");
    setStudySessionId(selected?.studySessionId ?? "");
    setMode("concept");
    setAttemptId("");
    setMessages(props.initialMessages);
  }, [props.conversations, props.initialMessages, props.objectives, props.selectedConversationId]);

  const selectedConversation = props.conversations.find((conversation) => conversation.id === conversationId) ?? null;
  const selectedObjective = props.objectives.find((objective) => objective.id === objectiveId) ?? null;
  const selectedDocument = props.documents.find((document) => document.id === documentId) ?? null;
  const selectedSession = props.sessions.find((session) => session.id === studySessionId) ?? null;
  const matchingAttempts = props.attempts.filter((attempt) => attempt.objectiveId === objectiveId);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user") ?? null;
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  const latestRecommendation = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    return asRecommendation(latestAssistant?.responseMetadata);
  }, [messages]);

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setNotice(null);
    setObjectiveId(props.objectives[0]?.id ?? "");
    setDocumentId("");
    setStudySessionId("");
    setMode("concept");
    setAttemptId("");
    router.push("/tutor?new=1");
  }

  async function sendTurn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const trimmed = request.trim();
    if (!trimmed || !objectiveId) {
      setNotice("Elegí un objetivo y escribí un mensaje.");
      return;
    }

    setIsSending(true);
    try {
      const tutorRequest = {
        request: trimmed,
        mode,
        objectiveId,
        conversationId,
        documentId: documentId || null,
        studySessionId: studySessionId || null,
        ...(mode === "exercise" && attemptId ? { attemptId } : {}),
      };
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tutorRequest),
      });
      const result = await response.json() as {
        ok?: boolean;
        error?: string;
        conversationId?: string;
        messages?: Array<{
          id: string;
          role: "user" | "assistant";
          content: string;
          position: number;
          response_metadata: unknown;
          created_at: string;
        }>;
      };
      if (!response.ok || !result.ok || !result.conversationId || !result.messages) {
        throw new Error(result.error ?? "No se pudo obtener una respuesta segura del tutor.");
      }
      const appended = result.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        position: message.position,
        responseMetadata: message.response_metadata,
        createdAt: message.created_at,
      }));
      setMessages((current) => [...current, ...appended]);
      setConversationId(result.conversationId);
      setRequest("");
      router.replace(`/tutor?conversation=${encodeURIComponent(result.conversationId)}`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  }

  const hasAttempt = Boolean(latestUserMessage);
  const hasGuidance = assistantMessages.length > 0;
  const hasRecommendation = Boolean(latestRecommendation);

  return (
    <main className="tutor-main">
      <nav className="tutor-breadcrumb" aria-label="Contexto de tutoría">
        <span>Tutor IA</span><b aria-hidden="true">›</b>
        <span>{selectedObjective?.title ?? "Elegí un objetivo"}</span>
        {selectedConversation && <><b aria-hidden="true">›</b><strong>{selectedConversation.title}</strong></>}
        <span className="tutor-study-mode"><i aria-hidden="true" />Modo estudio activo</span>
      </nav>

      <header className="tutor-focus-header">
        <div>
          <p className="dashboard-kicker">Tutor privado con Codex</p>
          <h1>{selectedConversation?.title ?? "Construí la solución paso a paso"}</h1>
          <p>{latestUserMessage ? "El problema en foco se mantiene ligado a esta conversación privada." : "Planteá el problema y mostrale al tutor qué intentaste antes de pedir una explicación."}</p>
        </div>
        <span className="tutor-local-badge"><i aria-hidden="true" /> Tutor IA · privado</span>
      </header>

      <section className="tutor-control-deck tutor-panel" aria-labelledby="tutor-context-title">
        <div className="tutor-panel-heading">
          <PanelTitle label="Contexto" id="tutor-context-title">{conversationId ? "Contexto fijado para esta conversación" : "Preparar conversación"}</PanelTitle>
          <button className="tutor-quiet-button" type="button" onClick={startNewConversation}>Nueva conversación</button>
        </div>
        <div className="tutor-context-form tutor-context-grid">
          <label>Objetivo
            <select
                  value={objectiveId}
                  onChange={(event) => {
                    setObjectiveId(event.target.value);
                    setAttemptId("");
                  }}
                  disabled={Boolean(conversationId)}
                >
              {!props.objectives.length && <option value="">No hay objetivos disponibles</option>}
              {props.objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}
            </select>
          </label>
          <label>Documento privado <span>(opcional)</span>
            <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} disabled={Boolean(conversationId)}>
              <option value="">Sin documento</option>
              {props.documents.map((document) => <option key={document.id} value={document.id}>{document.fileName} · {document.mimeType === "application/pdf" ? "PDF" : "TXT"}</option>)}
            </select>
          </label>
          <label>Sesión activa <span>(opcional)</span>
            <select value={studySessionId} onChange={(event) => setStudySessionId(event.target.value)} disabled={Boolean(conversationId)}>
              <option value="">Sin sesión vinculada</option>
              {props.sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="tutor-mode-control">
          <legend>Modo de tutoría</legend>
          <div className="tutor-mode-options">
            <label>
              <input type="radio" name="tutor-mode" value="concept" checked={mode === "concept"} onChange={() => { setMode("concept"); setAttemptId(""); }} />
              <span><strong>Estudio de conceptos</strong><small>Explicaciones, preguntas y práctica de recuperación.</small></span>
            </label>
            <label>
              <input type="radio" name="tutor-mode" value="exercise" checked={mode === "exercise"} onChange={() => setMode("exercise")} />
              <span><strong>Revisión de ejercicio</strong><small>La solución requiere verificar un intento independiente exacto.</small></span>
            </label>
          </div>
          {mode === "exercise" && (
            <label className="tutor-attempt-select">Intento independiente <span>(opcional)</span>
              <select value={attemptId} onChange={(event) => setAttemptId(event.target.value)}>
                <option value="">Sin intento verificado · solo pistas</option>
                {matchingAttempts.map((attempt) => (
                  <option key={attempt.id} value={attempt.id}>Intento del {formatDate(attempt.createdAt)}</option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
        {conversationId && <p className="tutor-context-lock" role="status">El objetivo, documento y sesión quedan fijados para conservar la trazabilidad. Iniciá una conversación nueva para cambiarlos.</p>}
      </section>

      <section className="tutor-workspace-grid" aria-label="Espacio de tutoría">
        <div className="tutor-primary-column">
          <section className="tutor-problem-card tutor-panel" aria-labelledby="problem-title">
            <div className="tutor-card-heading">
              <div className="tutor-title-with-icon"><span className="tutor-icon purple"><BoltIcon /></span><PanelTitle label="Problema en foco" id="problem-title">{selectedObjective?.title ?? "Objetivo pendiente"}</PanelTitle></div>
              {latestUserMessage && <time dateTime={latestUserMessage.createdAt}>{formatTime(latestUserMessage.createdAt)}</time>}
            </div>
            <p className={latestUserMessage ? "tutor-problem-copy" : "tutor-empty-copy"}>
              {latestUserMessage?.content ?? "Todavía no hay un planteamiento. Escribí el enunciado y tu intento para que el acompañamiento parta de evidencia real."}
            </p>
          </section>

          <section className="tutor-progressive-card tutor-panel" aria-labelledby="progressive-title">
            <div className="tutor-card-heading">
              <div className="tutor-title-with-icon"><span className="tutor-icon blue"><BoltIcon /></span><PanelTitle label="Ayuda progresiva" id="progressive-title">Avance de la conversación</PanelTitle></div>
              <span className="tutor-step-count">{hasRecommendation ? "3 de 3" : hasGuidance ? "2 de 3" : hasAttempt ? "1 de 3" : "0 de 3"}</span>
            </div>
            <ol className="tutor-progress-steps">
              <li className={hasAttempt ? "done" : "active"}><span>1</span><div><strong>Mostrar el intento</strong><p>Compartí tu razonamiento para ubicar el punto exacto de dificultad.</p></div></li>
              <li className={hasGuidance ? "done" : hasAttempt || isSending ? "active" : ""}><span>2</span><div><strong>Trabajar con una pista</strong><p>Codex guía el siguiente paso sin reemplazar tu resolución independiente.</p></div></li>
              <li className={hasRecommendation ? "done" : hasGuidance ? "active" : ""}><span>3</span><div><strong>Elegir el siguiente paso</strong><p>La recomendación se basa en lo observado durante esta conversación.</p></div></li>
            </ol>
          </section>

          <section className="tutor-chat tutor-panel" aria-labelledby="tutor-chat-title">
            <div className="tutor-chat-heading">
              <PanelTitle label="Conversación" id="tutor-chat-title">{selectedConversation?.title ?? "Nuevo diálogo"}</PanelTitle>
              <span>{messages.length} mensajes</span>
            </div>

            <div
              className="tutor-messages"
              role="log"
              tabIndex={0}
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={isSending}
              aria-label="Historial de mensajes del tutor"
            >
              {!messages.length && (
                <div className="tutor-welcome">
                  <span aria-hidden="true"><BoltIcon size={22} /></span>
                  <h3>¿Qué querés entender mejor?</h3>
                  <p>Contá tu razonamiento o pegá el enunciado. Si es un ejercicio, primero necesitamos ver tu intento independiente.</p>
                </div>
              )}
              {messages.map((message) => (
                <article className={`tutor-message ${message.role}`} key={message.id} aria-label={message.role === "assistant" ? "Respuesta del Tutor Codex" : "Tu mensaje"}>
                  <span className="tutor-avatar" aria-hidden="true">{message.role === "assistant" ? <BoltIcon size={14} /> : "TÚ"}</span>
                  <div>
                    <p>{message.content}</p>
                    <small>{message.role === "assistant" ? "Tutor Codex" : "Tu mensaje"} · <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></small>
                  </div>
                </article>
              ))}
              {isSending && <p className="tutor-thinking" role="status"><span aria-hidden="true" />Codex está preparando una respuesta segura…</p>}
            </div>

            <form className="tutor-composer" onSubmit={sendTurn}>
              <label className="sr-only" htmlFor="tutor-request">Mensaje para el tutor</label>
              <textarea
                id="tutor-request"
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Explicá qué intentaste o qué parte no entendés…"
                disabled={isSending || !props.objectives.length}
                aria-describedby="tutor-composer-help tutor-character-count"
                required
              />
              <div>
                <span id="tutor-composer-help">Incluí tu razonamiento, no solo la respuesta final.</span>
                <span id="tutor-character-count">{request.length}/2000</span>
                <button className="tutor-primary" type="submit" disabled={isSending || !props.objectives.length}>{isSending ? "Enviando…" : conversationId ? "Continuar" : "Iniciar tutoría"}</button>
              </div>
            </form>
            {notice && <p className="tutor-notice" role="alert">{notice}</p>}
          </section>
        </div>

        <aside className="tutor-secondary-column" aria-label="Documento, recomendación e historial">
          <section className="tutor-manuscript tutor-panel" aria-labelledby="manuscript-title">
            <div className="tutor-card-heading">
              <PanelTitle label="Manuscrito y contexto" id="manuscript-title">{selectedDocument?.fileName ?? "Sin documento vinculado"}</PanelTitle>
              {selectedDocument && <span className="tutor-file-type">{selectedDocument.mimeType === "application/pdf" ? "PDF" : "TXT"}</span>}
            </div>
            <div className="tutor-manuscript-canvas">
              {selectedDocument ? (
                <>
                  <span className="tutor-document-mark" aria-hidden="true">{selectedDocument.mimeType === "application/pdf" ? "PDF" : "TXT"}</span>
                  <strong>{selectedDocument.fileName}</strong>
                  <p>El tutor recibe únicamente el texto compatible extraído por el flujo de documentos.</p>
                  <div className="tutor-unavailable-state" role="status"><span aria-hidden="true">!</span><p><strong>Anotaciones visuales y OCR no disponibles</strong>No se muestran marcas sobre imágenes ni se interpreta contenido visual no extraído.</p></div>
                </>
              ) : (
                <>
                  <span className="tutor-document-mark empty" aria-hidden="true">—</span>
                  <strong>No se adjuntó un manuscrito</strong>
                  <p>La conversación usa el objetivo y la sesión seleccionados como contexto.</p>
                </>
              )}
            </div>
            {selectedSession && <p className="tutor-session-context"><span>Sesión vinculada</span><strong>{selectedSession.title}</strong>{selectedSession.startedAt && <time dateTime={selectedSession.startedAt}>{formatDate(selectedSession.startedAt)}</time>}</p>}
          </section>

          <section className="tutor-recommendation tutor-panel" aria-labelledby="recommendation-title">
            <div className="tutor-title-with-icon"><span className="tutor-icon purple"><BoltIcon /></span><PanelTitle label="Retroalimentación" id="recommendation-title">Recomendación del Tutor IA</PanelTitle></div>
            {latestRecommendation ? (
              <div className="tutor-recommendation-content">
                <strong>{actionLabels[latestRecommendation.suggestedNextAction ?? ""] ?? "Continuar con acompañamiento"}</strong>
                {latestRecommendation.recommendedTopic && <p><span>Tema sugerido</span>{latestRecommendation.recommendedTopic}</p>}
                {latestRecommendation.evidenceSummary && <div className="tutor-feedback-summary"><span aria-hidden="true">i</span><p>{latestRecommendation.evidenceSummary}</p></div>}
                <dl>
                  <div><dt>Confianza</dt><dd>{latestRecommendation.confidence ?? "baja"}</dd></div>
                  <div><dt>Señal observada</dt><dd>{latestRecommendation.observedMasterySignal?.replaceAll("_", " ") ?? "sin observar"}</dd></div>
                </dl>
              </div>
            ) : <p className="tutor-empty">Después de una respuesta vas a ver una sugerencia para seguir. No modifica tu dominio.</p>}
            <p className="tutor-advisory">Solo tus intentos y evaluaciones autorizadas actualizan la evidencia de aprendizaje.</p>
          </section>

          <section className="tutor-history tutor-panel" aria-labelledby="history-title">
            <div className="tutor-history-heading"><p className="section-label" id="history-title">Conversaciones recientes</p><span>{props.conversations.length}</span></div>
            {props.conversations.length ? (
              <ol className="tutor-conversation-list">
                {props.conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      className={conversation.id === conversationId ? "active" : ""}
                      type="button"
                      onClick={() => router.push(`/tutor?conversation=${encodeURIComponent(conversation.id)}`)}
                      aria-current={conversation.id === conversationId ? "page" : undefined}
                    >
                      <strong>{conversation.title}</strong>
                      <small>{formatDate(conversation.updatedAt)}</small>
                    </button>
                  </li>
                ))}
              </ol>
            ) : <p className="tutor-empty">Tu primera conversación aparecerá acá.</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
