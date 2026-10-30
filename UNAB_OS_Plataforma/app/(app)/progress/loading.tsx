export default function ProgressLoading() {
  return <main className="progress-page progress-loading" aria-busy="true" aria-live="polite">
    <header className="progress-page-header"><div><p className="dashboard-kicker">Evidencia de aprendizaje</p><h1>Cargando progreso…</h1><p>Estamos recuperando objetivos, intentos, dominio y sesiones de estudio.</p></div></header>
    <section className="progress-summary-grid" aria-label="Cargando resumen">{Array.from({ length: 4 }, (_, index) => <article className="progress-metric" key={index}><i /><div><small /><strong /><span /></div></article>)}</section>
    <section className="progress-loading-grid" aria-label="Cargando paneles">{Array.from({ length: 6 }, (_, index) => <article className="progress-card" key={index}><span /><i /><i /><i /></article>)}</section>
  </main>;
}
