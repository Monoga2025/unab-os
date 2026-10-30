export default function StudyLoading() {
  return (
    <main className="study-main" aria-busy="true" aria-live="polite">
      <header className="study-hero">
        <div>
          <p className="dashboard-kicker">Espacio personal</p>
          <h1>Cargando tu espacio de estudio…</h1>
          <p>Estamos preparando tus documentos y sesiones.</p>
        </div>
      </header>
      <section className="study-layout" aria-label="Cargando herramientas de estudio">
        <article className="study-card" role="status">
          <p className="section-label">Biblioteca privada</p>
          <h2>Cargando documentos…</h2>
        </article>
        <article className="study-card" role="status">
          <p className="section-label">Actividad</p>
          <h2>Cargando sesiones…</h2>
        </article>
      </section>
    </main>
  );
}
