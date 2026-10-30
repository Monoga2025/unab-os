"use client";

import { useActionState, useEffect } from "react";
import { createAcademicItem, updateAcademicItem } from "@/app/actions/academic-collaboration";
import {
  ACADEMIC_IMPORTANCE,
  ACADEMIC_ITEM_TYPES,
  type AcademicActionState,
  type AcademicImportance,
  type AcademicItemType,
} from "@/lib/domain/academic-collaboration";

export type EditableItem = {
  id: string;
  section_id: string;
  item_type: AcademicItemType;
  title: string;
  body: string;
  importance: AcademicImportance;
  starts_at: string | null;
  due_at: string | null;
  version: number;
};

type Props = {
  sectionId: string;
  item?: EditableItem | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  onConflict?: (conflict: NonNullable<AcademicActionState["conflict"]>) => void;
};

const INITIAL_STATE: AcademicActionState = { ok: true, message: "" };

export function AcademicItemForm({ sectionId, item, onSuccess, onCancel, onConflict }: Props) {
  const isEditing = Boolean(item);
  const actionFn = isEditing ? updateAcademicItem : createAcademicItem;

  const [state, formAction, isPending] = useActionState(
    async (_prev: AcademicActionState, formData: FormData) => actionFn(formData),
    INITIAL_STATE
  );

  useEffect(() => {
    if (state.ok && state.message && onSuccess) {
      onSuccess();
    } else if (!state.ok && state.conflict && onConflict) {
      onConflict(state.conflict);
    }
  }, [state, onSuccess, onConflict]);

  const defaultType: AcademicItemType = item?.item_type ?? "note";
  const defaultImportance: AcademicImportance = item?.importance ?? "normal";
  const itemType = item?.item_type ?? "note";

  return (
    <form action={formAction} className="academic-form-modal">
      <h3 className="academic-modal-title">
        {isEditing ? "Editar contenido colaborativo" : "Nuevo contenido colaborativo"}
      </h3>

      <input type="hidden" name="sectionId" value={sectionId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {item && <input type="hidden" name="expectedVersion" value={item.version} />}

      <div className="academic-form-field">
        <label htmlFor="academic-item-type" className="academic-label">
          Tipo de contenido
        </label>
        <select
          id="academic-item-type"
          name="itemType"
          defaultValue={defaultType}
          disabled={isEditing}
          className="academic-select"
        >
          {ACADEMIC_ITEM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "note" && "Apunte / Nota"}
              {type === "event" && "Evento de clase"}
              {type === "reminder" && "Recordatorio"}
              {type === "task" && "Tarea / Entrega"}
              {type === "evaluation" && "Evaluación (Parcial / Quiz)"}
            </option>
          ))}
        </select>
      </div>

      <div className="academic-form-field">
        <label htmlFor="academic-item-title" className="academic-label">
          Título
        </label>
        <input
          id="academic-item-title"
          name="title"
          type="text"
          defaultValue={item?.title ?? ""}
          required
          maxLength={240}
          placeholder="Ej. Taller 2 - Derivadas, Parcial 1..."
          className="academic-input"
        />
        {state.fieldErrors?.title && <p className="academic-error-text">{state.fieldErrors.title}</p>}
      </div>

      <div className="academic-form-field">
        <label htmlFor="academic-item-body" className="academic-label">
          Contenido / Descripción
        </label>
        <textarea
          id="academic-item-body"
          name="body"
          defaultValue={item?.body ?? ""}
          required
          rows={5}
          maxLength={5000}
          placeholder="Escribí los detalles, temas evaluados, ejercicios asignados o notas para tus compañeros..."
          className="academic-textarea"
        />
        {state.fieldErrors?.body && <p className="academic-error-text">{state.fieldErrors.body}</p>}
        {itemType === "evaluation" && (
          <p className="academic-help-text">
            Guía para evaluaciones: Podés detallar instrucciones, ponderación o formato de ejercicios (ej. Tres ejercicios; resolver uno).
          </p>
        )}
        {itemType === "note" && (
          <p className="academic-help-text">
            Los apuntes quedan accesibles de inmediato para todo el grupo de clase.
          </p>
        )}
      </div>

      <div className="academic-form-row">
        <div className="academic-form-field">
          <label htmlFor="academic-item-importance" className="academic-label">
            Importancia
          </label>
          <select
            id="academic-item-importance"
            name="importance"
            defaultValue={defaultImportance}
            className="academic-select"
          >
            {ACADEMIC_IMPORTANCE.map((imp) => (
              <option key={imp} value={imp}>
                {imp === "low" && "Baja"}
                {imp === "normal" && "Normal"}
                {imp === "high" && "Alta"}
                {imp === "critical" && "Crítica"}
              </option>
            ))}
          </select>
        </div>

        <div className="academic-form-field">
          <label htmlFor="academic-item-starts" className="academic-label">
            Fecha de inicio (opcional)
          </label>
          <input
            id="academic-item-starts"
            name="startsAt"
            type="datetime-local"
            defaultValue={item?.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : ""}
            className="academic-input"
          />
          {state.fieldErrors?.startsAt && <p className="academic-error-text">{state.fieldErrors.startsAt}</p>}
        </div>

        <div className="academic-form-field">
          <label htmlFor="academic-item-due" className="academic-label">
            Fecha límite / Hora (Requerida en tareas y evaluaciones)
          </label>
          <input
            id="academic-item-due"
            name="dueAt"
            type="datetime-local"
            defaultValue={item?.due_at ? new Date(item.due_at).toISOString().slice(0, 16) : ""}
            className="academic-input"
          />
          {state.fieldErrors?.dueAt && <p className="academic-error-text">{state.fieldErrors.dueAt}</p>}
        </div>
      </div>

      {!state.ok && state.message && <p className="academic-error-text">{state.message}</p>}

      <div className="academic-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="academic-btn academic-btn-secondary">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={isPending} className="academic-btn academic-btn-primary">
          {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Publicar en la sección"}
        </button>
      </div>
    </form>
  );
}
