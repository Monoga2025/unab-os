"use client";

export default function TemaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="tema-detail"><section className="tema-card tema-not-found" role="alert" aria-labelledby="tema-error-title"><p className="section-label">TEMA · consulta local</p><h1 id="tema-error-title">No pudimos cargar la información académica.</h1><p>La fuente privada no se modificó. Verificá que la captura local esté disponible e intentá nuevamente.</p><button type="button" onClick={reset}>Reintentar</button></section></main>;
}
