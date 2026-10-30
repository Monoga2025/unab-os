export default function EntrenadorLoading() {
  return (
    <main className="entrenador-main" aria-busy="true" aria-live="polite">
      <header className="entrenador-header">
        <div>
          <p className="dashboard-kicker">Entrenador de parciales</p>
          <h1>Preparando tu entrenador…</h1>
        </div>
      </header>
      <section className="entrenador-chat entrenador-panel" role="status" aria-label="Cargando entrenador">
        <div className="entrenador-loading-lines" aria-hidden="true"><i /><i /><i /></div>
      </section>
    </main>
  );
}
