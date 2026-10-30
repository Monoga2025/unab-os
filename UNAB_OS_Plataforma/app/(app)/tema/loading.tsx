export default function TemaLoading() {
  return <main className="tema-page tema-loading" aria-busy="true" aria-live="polite">
    <header className="tema-hero"><div><p className="dashboard-kicker">TEMA · consulta local</p><h1>Cargando materias…</h1><p>Estamos organizando las fechas y el inventario académico capturado.</p></div></header>
    <section className="tema-priority-grid" aria-label="Cargando agenda académica">{[1, 2, 3].map((item) => <article className="tema-card" role="status" key={item}><span /><i /><i /><i /></article>)}</section>
  </main>;
}
