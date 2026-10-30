"use client";

export default function TutorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="tutor-main">
      <nav className="tutor-breadcrumb" aria-label="Contexto de tutoría"><span>Tutor IA</span><b aria-hidden="true">›</b><strong>No disponible</strong></nav>
      <section className="tutor-panel tutor-error" role="alert" aria-labelledby="tutor-error-title">
        <p className="section-label">Tutor privado</p>
        <h1 id="tutor-error-title">No pudimos cargar tu tutor.</h1>
        <p>Tu historial permanece guardado. Intentá nuevamente para recuperar la conversación y su contexto.</p>
        <button className="tutor-primary" type="button" onClick={reset}>Reintentar</button>
      </section>
    </main>
  );
}
