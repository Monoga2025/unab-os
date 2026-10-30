"use client";

import Link from "next/link";

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="academic-error-boundary" role="alert">
      <h2 className="academic-section-title">No se pudo acceder a la sección</h2>
      <p className="academic-help-text">
        {error.message || "Es posible que no tengas permisos para ver este grupo de clase o que haya ocurrido un problema de conexión."}
      </p>
      <div className="academic-card-actions">
        <button type="button" onClick={() => reset()} className="academic-btn academic-btn-primary">
          Reintentar
        </button>
        <Link href="/materias" className="academic-btn academic-btn-secondary">
          Volver a Mis Materias
        </Link>
      </div>
    </div>
  );
}
