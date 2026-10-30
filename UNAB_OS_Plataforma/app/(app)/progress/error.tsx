"use client";

export default function ProgressError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="progress-page">
    <section className="progress-card progress-error" role="alert" aria-labelledby="progress-error-title">
      <p className="section-label">Progreso</p>
      <h1 id="progress-error-title">No pudimos cargar tu progreso.</h1>
      <p>Tus datos permanecen guardados. Intentá nuevamente para recuperar objetivos, intentos, dominio y sesiones.</p>
      <button type="button" onClick={reset}>Reintentar</button>
    </section>
  </main>;
}
