"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  cancelStudySession,
  completeStudySession,
  createStudySession,
  startStudySession,
} from "@/app/actions/study";
import {
  documentUploadPolicy,
  studySessionTargetPolicy,
  type StudyDocumentKind,
  type StudySessionStatus,
} from "@/lib/domain/study";
import { StudyPlanSummary } from "@/components/study-plan-summary";

type StudyDocumentView = {
  id: string;
  kind: StudyDocumentKind;
  status: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type StudySessionView = {
  id: string;
  title: string;
  status: StudySessionStatus;
  plannedFor: string;
  targetMinutes: number | null;
  startedAt: string | null;
  documentNames: string[];
  temaResources: { fileName: string; href: string }[];
  handoffStatus: "queued" | "processing" | "delivered" | "reviewed" | "failed" | null;
  courseName: string | null;
};

type Notice = { tone: "success" | "error"; message: string } | null;

const statusLabels: Record<StudySessionStatus, string> = {
  planned: "Planificada",
  active: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const telegramStatusLabels: Record<Exclude<StudySessionView["handoffStatus"], null>, string> = {
  queued: "En cola para Telegram",
  processing: "Enviando a Telegram",
  delivered: "Entregado en Telegram",
  reviewed: "Informe recibido",
  failed: "No se pudo entregar en Telegram",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  return bytes < 1_000_000 ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <p className={`study-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</p>;
}

export function StudyWorkspace({ documents, sessions }: { documents: StudyDocumentView[]; sessions: StudySessionView[] }) {
  const router = useRouter();
  const [uploadNotice, setUploadNotice] = useState<Notice>(null);
  const [sessionNotice, setSessionNotice] = useState<Notice>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, startCreating] = useTransition();
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const sessionFormRef = useRef<HTMLFormElement>(null);
  const readyDocuments = useMemo(() => documents.filter((document) => document.status === "ready"), [documents]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadNotice(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || file.size === 0 || (kind !== "material" && kind !== "rubric")) {
      setUploadNotice({ tone: "error", message: "Elegí un archivo y su tipo." });
      return;
    }

    const extension = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
    if (file.size > documentUploadPolicy.maxBytes || (extension !== "pdf" && extension !== "txt")) {
      setUploadNotice({ tone: "error", message: "Usá un PDF o TXT de hasta 10 MB con un nombre válido." });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/study/documents", { method: "POST", body: form });
      const result = await response.json() as { ok: boolean; message?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo agregar el documento.");

      uploadFormRef.current?.reset();
      setUploadNotice({ tone: "success", message: result.message ?? "Documento agregado a tu espacio de estudio." });
      router.refresh();
    } catch (error) {
      setUploadNotice({ tone: "error", message: error instanceof Error ? error.message : "No se pudo agregar el documento." });
    } finally {
      setIsUploading(false);
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionNotice(null);
    const formData = new FormData(event.currentTarget);
    const localPlannedFor = formData.get("plannedFor");
    if (typeof localPlannedFor === "string" && localPlannedFor) {
      formData.set("plannedFor", new Date(localPlannedFor).toISOString());
    }
    startCreating(async () => {
      try {
        const result = await createStudySession(formData);
        setSessionNotice({ tone: result.ok ? "success" : "error", message: result.message });
        if (result.ok) {
          sessionFormRef.current?.reset();
          router.refresh();
        }
      } catch {
        setSessionNotice({ tone: "error", message: "No se pudo planificar la sesión." });
      }
    });
  }

  async function handleTransition(sessionId: string, action: "start" | "complete" | "cancel") {
    setSessionNotice(null);
    setTransitioningId(sessionId);
    try {
      const result = action === "start"
        ? await startStudySession(sessionId)
        : action === "complete"
          ? await completeStudySession(sessionId)
          : await cancelStudySession(sessionId);
      setSessionNotice({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    } catch {
      setSessionNotice({ tone: "error", message: "No se pudo actualizar la sesión." });
    } finally {
      setTransitioningId(null);
    }
  }

  return (
    <main className="study-main">
      <header className="study-hero">
        <div>
          <p className="dashboard-kicker">Tu trabajo de hoy</p>
          <h1>Estudio</h1>
          <p>Continuá una sesión iniciada desde TEMA o planificá un bloque con tus propios documentos.</p>
        </div>
        <div className="study-summary" aria-label="Resumen del espacio de estudio">
          <span><strong>{readyDocuments.length}</strong> documentos</span>
          <span><strong>{sessions.filter((session) => session.status === "active").length}</strong> en curso</span>
          <span><strong>{sessions.filter((session) => session.status === "planned").length}</strong> planificadas</span>
        </div>
      </header>

      <section className="study-card study-plan-overview" aria-labelledby="study-plan-title">
        <div className="study-card-heading">
          <div><p className="section-label">Tu agenda real</p><h2 id="study-plan-title">Plan de estudio</h2></div>
          <span className="study-card-icon purple" aria-hidden="true">◷</span>
        </div>
        <StudyPlanSummary sessions={sessions} />
      </section>

      <section className="study-layout" aria-label="Herramientas de estudio personal">
        <div className="study-column">
          <article className="study-card">
            <div className="study-card-heading">
              <div><p className="section-label">Biblioteca privada</p><h2>Agregar documento</h2></div>
              <span className="study-card-icon" aria-hidden="true">＋</span>
            </div>
            <p className="study-supporting">PDF o TXT en UTF-8. Máximo 10 MB. Solo vos podés acceder al archivo.</p>
            <form className="study-form" onSubmit={handleUpload} ref={uploadFormRef}>
              <label>Tipo
                <select name="kind" defaultValue="material">
                  <option value="material">Material de estudio</option>
                  <option value="rubric">Rúbrica o criterio</option>
                </select>
              </label>
              <label>Archivo
                <input name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain" required />
              </label>
              <button className="study-primary" type="submit" disabled={isUploading}>{isUploading ? "Subiendo…" : "Guardar documento"}</button>
            </form>
            <NoticeBanner notice={uploadNotice} />
          </article>

          <article className="study-card">
            <div className="study-card-heading"><div><p className="section-label">Documentos actuales</p><h2>Tu biblioteca</h2></div><span className="study-count">{documents.length}</span></div>
            {documents.length ? (
              <ul className="study-document-list">
                {documents.map((document) => <li key={document.id}>
                  <span className={`study-file-mark ${document.kind}`} aria-hidden="true">{document.mimeType === "application/pdf" ? "PDF" : document.mimeType === "text/plain" ? "TXT" : "DOC"}</span>
                  <span className="study-file-copy"><strong>{document.fileName}</strong><small>{document.kind === "rubric" ? "Rúbrica" : "Material"} · {formatBytes(document.sizeBytes)}</small></span>
                  <span className={`study-document-status ${document.status}`}>{document.status === "ready" ? "Listo" : document.status}</span>
                </li>)}
              </ul>
            ) : <p className="study-empty">Todavía no agregaste documentos.</p>}
          </article>
        </div>

        <div className="study-column study-session-column">
          <article className="study-card study-planner">
            <div className="study-card-heading">
              <div><p className="section-label">Próxima sesión</p><h2>Planificar estudio</h2></div>
              <span className="study-card-icon purple" aria-hidden="true">◷</span>
            </div>
            <form className="study-form" onSubmit={handleCreate} ref={sessionFormRef}>
              <label>Tema o título
                <input name="title" type="text" maxLength={160} placeholder="Ej. Repasar dinámica rotacional" required />
              </label>
              <label>Fecha y hora
                <input name="plannedFor" type="datetime-local" required />
              </label>
              <label>Duración objetivo <span>(opcional)</span>
                <input
                  name="targetMinutes"
                  type="number"
                  min={studySessionTargetPolicy.minMinutes}
                  max={studySessionTargetPolicy.maxMinutes}
                  step={1}
                  placeholder="Ej. 45 minutos"
                />
              </label>
              <fieldset>
                <legend>Documentos para esta sesión <span>(opcional)</span></legend>
                {readyDocuments.length ? <div className="study-document-options">{readyDocuments.map((document) => (
                  <label key={document.id}><input type="checkbox" name="documentIds" value={document.id} /><span>{document.fileName}</span></label>
                ))}</div> : <p>Agregá un documento para poder vincularlo.</p>}
              </fieldset>
              <button className="study-primary" type="submit" disabled={isCreating}>{isCreating ? "Planificando…" : "Planificar sesión"}</button>
            </form>
          </article>

          <article className="study-card study-sessions">
            <div className="study-card-heading"><div><p className="section-label">Actividad</p><h2>Sesiones recientes</h2></div><span className="study-count">{sessions.length}</span></div>
            <NoticeBanner notice={sessionNotice} />
            {sessions.length ? <ol className="study-session-list">{sessions.map((session) => {
              const busy = transitioningId === session.id;
              return <li key={session.id} className={session.status === "active" ? "active" : ""}>
                <div className="study-session-top"><span className={`study-status ${session.status}`}>{statusLabels[session.status]}</span><time dateTime={session.plannedFor} suppressHydrationWarning>{formatDate(session.plannedFor)}</time></div>
                <h3>{session.title}</h3>
                {session.courseName && <p className="study-session-course">{session.courseName}</p>}
                {session.targetMinutes !== null && <p>Objetivo: {session.targetMinutes} min</p>}
                {session.documentNames.length
                  ? <p>{session.documentNames.join(" · ")}</p>
                  : session.temaResources.length === 0 ? <p>Sin documentos vinculados</p> : null}
                {session.temaResources.length > 0 && <ul className="study-tema-resources" aria-label="Recursos TEMA de esta sesión">
                  {session.temaResources.map((resource) => <li key={resource.href}>
                    <span>{resource.fileName}</span>
                    <a href={resource.href} target="_blank" rel="noreferrer">Abrir recurso</a>
                  </li>)}
                </ul>}
                {session.handoffStatus && <p className={`study-telegram-status ${session.handoffStatus}`} role="status">
                  Telegram: {telegramStatusLabels[session.handoffStatus]}
                </p>}
                {(session.status === "planned" || session.status === "active") && <div className="study-session-actions">
                  {session.status === "planned" && <button type="button" onClick={() => handleTransition(session.id, "start")} disabled={busy}>Iniciar</button>}
                  {session.status === "active" && <button type="button" onClick={() => handleTransition(session.id, "complete")} disabled={busy}>Completar</button>}
                  <button className="danger" type="button" onClick={() => handleTransition(session.id, "cancel")} disabled={busy}>{busy ? "Actualizando…" : "Cancelar"}</button>
                </div>}
              </li>;
            })}</ol> : <p className="study-empty">Planificá tu primera sesión para verla acá.</p>}
          </article>
        </div>
      </section>
      <p className="study-privacy-note">Los archivos se guardan en almacenamiento privado y se consultan con tu sesión autenticada.</p>
    </main>
  );
}
