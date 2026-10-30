"use client";

export default function EntrenadorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="entrenador-main">
      <section className="entrenador-panel entrenador-error" role="alert" aria-labelledby="entrenador-error-title">
        <p className="section-label">Entrenador de parciales</p>
        <h1 id="entrenador-error-title">No pudimos cargar tu entrenador.</h1>
        <p>El chat es local y no guarda nada por sí mismo. Intentá nuevamente para volver a abrirlo.</p>
        <button className="entrenador-primary" type="button" onClick={reset}>Reintentar</button>
      </section>
    </main>
  );
}
