"use client";

export default function StudyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="study-main">
      <section className="study-card" role="alert" aria-labelledby="study-error-title">
        <p className="section-label">Espacio personal</p>
        <h1 id="study-error-title">No pudimos cargar tu espacio de estudio.</h1>
        <p className="study-supporting">Tus documentos y sesiones siguen guardados. Intentá cargar la página otra vez.</p>
        <button className="study-primary" type="button" onClick={reset}>Reintentar</button>
      </section>
    </main>
  );
}
