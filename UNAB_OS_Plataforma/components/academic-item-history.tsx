"use client";

import { useActionState } from "react";
import { restoreAcademicItem } from "@/app/actions/academic-collaboration";
import type { AcademicActionState } from "@/lib/domain/academic-collaboration";

type Revision = {
  id: string;
  academic_item_id: string;
  section_id: string;
  version: number;
  action: string;
  changed_fields: unknown;
  actor_id: string;
  created_at: string;
};

type Props = {
  itemId: string;
  sectionId: string;
  createdBy?: string;
  updatedBy?: string;
  revisions: Revision[];
  onClose?: () => void;
};

const INITIAL_STATE: AcademicActionState = { ok: true, message: "" };

export function AcademicItemHistory({
  itemId,
  sectionId,
  createdBy,
  updatedBy,
  revisions,
  onClose,
}: Props) {
  const [restoreState, restoreAction, isPendingRestore] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => restoreAcademicItem(formData),
    INITIAL_STATE
  );

  const itemRevisions = revisions.filter((r) => r.academic_item_id === itemId);

  return (
    <div className="academic-history-panel" role="region" aria-label="Historial de cambios">
      <div className="academic-history-header">
        <h3 className="academic-history-title">Historial de cambios colaborativos</h3>
        {onClose && (
          <button type="button" onClick={onClose} className="academic-btn-quiet" aria-label="Cerrar historial">
            ✕
          </button>
        )}
      </div>

      <div className="academic-history-meta">
        {createdBy && <p className="academic-meta-line"><strong>Creado por:</strong> {createdBy}</p>}
        {updatedBy && <p className="academic-meta-line"><strong>Última edición por:</strong> {updatedBy}</p>}
      </div>

      <ol className="academic-history-list">
        {itemRevisions.length > 0 ? (
          itemRevisions.map((rev) => (
            <li key={rev.id} className="academic-history-entry">
              <div className="academic-history-entry-top">
                <span className="academic-version-pill">v{rev.version}</span>
                <span className="academic-action-type">
                  {rev.action === "create" && "Creación"}
                  {rev.action === "update" && "Edición"}
                  {rev.action === "soft_delete" && "Eliminación"}
                  {rev.action === "restore" && "Restauración"}
                </span>
                <time className="academic-history-time" dateTime={rev.created_at}>
                  {new Date(rev.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                </time>
              </div>

              {rev.action === "soft_delete" && (
                <form action={restoreAction} className="academic-restore-form">
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="sectionId" value={sectionId} />
                  <input type="hidden" name="expectedVersion" value={rev.version} />
                  <button
                    type="submit"
                    disabled={isPendingRestore}
                    className="academic-btn academic-btn-secondary academic-btn-sm"
                  >
                    {isPendingRestore ? "Restaurando..." : "Restaurar este contenido"}
                  </button>
                </form>
              )}
            </li>
          ))
        ) : (
          <li className="academic-history-empty">No hay revisiones anteriores registradas.</li>
        )}
      </ol>

      {!restoreState.ok && restoreState.message && (
        <p className="academic-error-text">{restoreState.message}</p>
      )}
    </div>
  );
}
