"use client";

export default function MateriasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="academic-error-boundary" role="alert">
      <h2 className="academic-section-title">Ocurrió un error al cargar las materias</h2>
      <p className="academic-help-text">
        {error.message || "No se pudo sincronizar la información institucional."}
      </p>
      <button type="button" onClick={() => reset()} className="academic-btn academic-btn-primary">
        Intentar de nuevo
      </button>
    </div>
  );
}
