"use client";

import Link from "next/link";

export default function EvaluacionesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="academic-error-boundary" role="alert">
      <h2 className="academic-section-title">Error al cargar las evaluaciones</h2>
      <p className="academic-help-text">
        {error.message || "Ocurrió un inconveniente al consultar las evaluaciones del calendario."}
      </p>
      <div className="academic-card-actions">
        <button type="button" onClick={() => reset()} className="academic-btn academic-btn-primary">
          Reintentar
        </button>
        <Link href="/dashboard" className="academic-btn academic-btn-secondary">
          Volver a Inicio
        </Link>
      </div>
    </div>
  );
}
