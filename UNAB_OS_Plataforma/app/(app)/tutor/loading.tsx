export default function TutorLoading() {
  return (
    <main className="tutor-main" aria-busy="true" aria-live="polite">
      <nav className="tutor-breadcrumb" aria-label="Contexto de tutoría">
        <span>Tutor IA</span><b aria-hidden="true">›</b><strong>Preparando espacio</strong>
        <span className="tutor-study-mode"><i aria-hidden="true" />Modo estudio activo</span>
      </nav>
      <header className="tutor-focus-header">
        <div><p className="dashboard-kicker">Tutor privado con Codex</p><h1>Preparando tu espacio de tutoría…</h1><p>Estamos recuperando tu contexto, documentos e historial privado.</p></div>
      </header>
      <section className="tutor-workspace-grid" aria-label="Cargando tutor">
        <div className="tutor-primary-column">
          <section className="tutor-panel tutor-loading-panel" role="status">
            <p className="section-label">Conversación</p><h2>Cargando mensajes…</h2>
            <div className="tutor-loading-lines" aria-hidden="true"><i /><i /><i /></div>
          </section>
        </div>
        <aside className="tutor-secondary-column">
          <section className="tutor-panel tutor-loading-panel" role="status">
            <p className="section-label">Contexto</p><h2>Cargando manuscrito y recomendación…</h2>
            <div className="tutor-loading-lines" aria-hidden="true"><i /><i /><i /></div>
          </section>
        </aside>
      </section>
    </main>
  );
}
