import { sendStudyMaterialWithJarvis } from "@/app/actions/jarvis";
import type { JarvisBridgeSnapshot, JarvisBridgeStatus } from "@/lib/jarvis/bridge";

export type JarvisStudyResource = Readonly<{
  candidateId: string;
  title: string;
  subject: string;
  topic: string;
  detail: string;
}>;

const statusLabels: Record<JarvisBridgeStatus, string> = {
  queued: "Preparando envío",
  delivered: "Entregado en Telegram",
  reviewed: "Informe recibido",
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function JarvisCoachPanel({ resources, snapshot }: { resources: readonly JarvisStudyResource[]; snapshot: JarvisBridgeSnapshot }) {
  const latest = snapshot.handoffs[0] ?? null;
  const reportEnvelope = snapshot.reports[0] ?? null;
  const reportHandoff = reportEnvelope
    ? snapshot.handoffs.find((item) => item.handoff.id === reportEnvelope.report.handoffId) ?? null
    : null;

  return (
    <section className="jarvis-coach" aria-labelledby="jarvis-coach-title">
      <header className="jarvis-coach-header">
        <div className="jarvis-coach-identity" aria-hidden="true"><span>J</span><i /></div>
        <div>
          <p className="section-label">Compañero proactivo · Telegram</p>
          <h2 id="jarvis-coach-title">Jarvis te pone a estudiar y trae la evidencia de vuelta.</h2>
          <p>Elegí un material. Jarvis te enviará el archivo, un prompt listo para ChatGPT y te pedirá el JSON final para analizar tu sesión acá.</p>
        </div>
        <span className="jarvis-ready"><i aria-hidden="true" /> Puente cloud preparado</span>
      </header>

      <div className="jarvis-coach-grid">
        <div className="jarvis-resource-picker">
          <div className="jarvis-firm-callout">
            <strong>“No me importa la excusa: es hora de estudiar.”</strong>
            <span>El mensaje es firme, pero siempre usa tareas y materiales reales; no inventa que incumpliste.</span>
          </div>
          <div className="jarvis-resource-list">
            {resources.map((resource) => (
              <article key={resource.candidateId}>
                <div><strong>{resource.title}</strong><p>{resource.detail}</p></div>
                <form action={sendStudyMaterialWithJarvis}>
                  <input type="hidden" name="candidateId" value={resource.candidateId} />
                  <input type="hidden" name="title" value={resource.title} />
                  <input type="hidden" name="subject" value={resource.subject} />
                  <input type="hidden" name="topic" value={resource.topic} />
                  <button type="submit">Enviar a Telegram</button>
                </form>
              </article>
            ))}
          </div>
          {!resources.length && <p className="jarvis-empty">No hay un archivo verificado disponible para enviar todavía.</p>}
        </div>

        <aside className="jarvis-activity" aria-label="Estado de Jarvis">
          <div className="jarvis-status-card">
            <span>Último envío</span>
            {latest ? <>
              <strong>{latest.handoff.title}</strong>
              <p><b className={`jarvis-status ${latest.status}`}>{statusLabels[latest.status]}</b> · <time dateTime={latest.handoff.createdAt}>{dateFormatter.format(new Date(latest.handoff.createdAt))}</time></p>
            </> : <p>Todavía no has enviado una sesión.</p>}
          </div>
          <ol className="jarvis-flow" aria-label="Flujo de la sesión">
            <li><span>1</span><div><strong>Telegram</strong><p>Recibís el empujón, el prompt y el archivo.</p></div></li>
            <li><span>2</span><div><strong>ChatGPT</strong><p>Estudiás activamente y copiás el JSON final.</p></div></li>
            <li><span>3</span><div><strong>Universidad OS</strong><p>Jarvis valida el JSON y muestra el informe aquí.</p></div></li>
          </ol>
        </aside>
      </div>

      {reportEnvelope && <article className="jarvis-report" aria-labelledby="jarvis-report-title">
        <div className="jarvis-report-heading">
          <div><p className="section-label">Informe externo recibido</p><h3 id="jarvis-report-title">{reportHandoff?.handoff.title ?? "Última sesión con Jarvis"}</h3></div>
          <span>Confianza {reportEnvelope.report.confidence === "high" ? "alta" : reportEnvelope.report.confidence === "medium" ? "media" : "baja"}</span>
        </div>
        <p className="jarvis-report-summary">{reportEnvelope.report.summary}</p>
        <div className="jarvis-report-columns">
          <section><h4>Lo que salió bien</h4>{reportEnvelope.report.strengths.length ? <ul>{reportEnvelope.report.strengths.map((item, index) => <li key={`${item.topic}-${index}`}><strong>{item.topic}</strong><span>{item.evidence}</span></li>)}</ul> : <p>Sin fortalezas observadas todavía.</p>}</section>
          <section><h4>Lo que hay que reforzar</h4>{reportEnvelope.report.weaknesses.length ? <ul>{reportEnvelope.report.weaknesses.map((item, index) => <li key={`${item.topic}-${index}`}><strong>{item.topic}</strong><span>{item.evidence}</span></li>)}</ul> : <p>Sin debilidades observadas.</p>}</section>
          <section><h4>Siguiente acción</h4>{reportEnvelope.report.nextActions.length ? <ul>{reportEnvelope.report.nextActions.map((item, index) => <li key={`${item.action}-${index}`}><strong>{item.minutes} min</strong><span>{item.action}</span></li>)}</ul> : <p>Sin acciones sugeridas.</p>}</section>
        </div>
        <p className="jarvis-advisory">Este JSON es evidencia externa orientativa. No cambia automáticamente tu nivel M0–M4 ni reemplaza intentos evaluados.</p>
      </article>}
    </section>
  );
}
