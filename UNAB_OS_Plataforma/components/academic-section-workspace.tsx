"use client";

import { useState } from "react";
import Link from "next/link";
import { AcademicItemForm, type EditableItem } from "@/components/academic-item-form";
import { AcademicItemHistory } from "@/components/academic-item-history";
import { softDeleteAcademicItem } from "@/app/actions/academic-collaboration";
import {
  ACADEMIC_ITEM_TYPES,
  type AcademicActionState,
  type AcademicItemType,
} from "@/lib/domain/academic-collaboration";

type NamedSection = {
  id: string;
  subject_id: string;
  professor_id: string;
  term: string;
  subjects?: { display_name?: string | null } | null;
  professors?: { display_name?: string | null } | null;
};

type Item = EditableItem & {
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

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
  section: NamedSection;
  items: Item[];
  revisions: Revision[];
};

type ViewMode = "all" | "notes" | "calendar" | "tasks" | "evaluations";

export function AcademicSectionWorkspace({ section, items, revisions }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<NonNullable<AcademicActionState["conflict"]> | null>(null);

  const supportedTypes = ["note", "event", "reminder", "task", "evaluation"] as const;

  const filteredItems = items.filter((item) => {
    if (viewMode === "all") return true;
    if (viewMode === "notes") return item.item_type === "note";
    if (viewMode === "calendar") return item.item_type === "event" || item.item_type === "reminder";
    if (viewMode === "tasks") return item.item_type === "task";
    if (viewMode === "evaluations") return item.item_type === "evaluation";
    return true;
  });

  const subjectName = section.subjects?.display_name ?? "Materia";
  const professorName = section.professors?.display_name ?? "Profesor no asignado";

  const historyItem = items.find((i) => i.id === historyItemId);

  return (
    <div className="academic-workspace">
      <header className="academic-workspace-header">
        <div>
          <nav className="academic-breadcrumb" aria-label="Ruta de navegación">
            <Link href="/materias" className="academic-breadcrumb-link">
              ← Volver a Mis Materias
            </Link>
          </nav>
          <h1 className="academic-heading">{subjectName}</h1>
          <p className="academic-subheading">
            Grupo con Prof. {professorName} · Período {section.term}
          </p>
        </div>

        <div className="academic-workspace-header-actions">
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsCreating(true);
            }}
            className="academic-btn academic-btn-primary"
          >
            + Publicar contenido
          </button>
        </div>
      </header>

      {conflict && (
        <aside className="academic-conflict-banner" role="alert">
          <h3 className="academic-conflict-title">Conflicto de edición detectado</h3>
          <p className="academic-conflict-message">
            Tu borrador no se guardó porque otra persona actualizó este contenido.
          </p>

          <div className="academic-conflict-diff">
            <div className="academic-conflict-block">
              <strong>Versión guardada por la otra persona (v{conflict.currentVersion}):</strong>
              <pre>{conflict.currentBody}</pre>
            </div>
            <div className="academic-conflict-block">
              <strong>Tu borrador que intentaste enviar:</strong>
              <pre>{conflict.attemptedBody}</pre>
            </div>
          </div>

          <div className="academic-conflict-actions">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(conflict.attemptedBody);
                alert("Borrador copiado al portapapeles.");
              }}
              className="academic-btn academic-btn-secondary"
            >
              Copiar mi borrador
            </button>
            <button
              type="button"
              onClick={() => setConflict(null)}
              className="academic-btn academic-btn-primary"
            >
              Cargar versión más reciente
            </button>
          </div>
        </aside>
      )}

      {(isCreating || editingItem) && (
        <div className="academic-modal-overlay">
          <div className="academic-modal-card">
            <AcademicItemForm
              sectionId={section.id}
              item={editingItem}
              onSuccess={() => {
                setIsCreating(false);
                setEditingItem(null);
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingItem(null);
              }}
              onConflict={(c) => {
                setConflict(c);
                setIsCreating(false);
                setEditingItem(null);
              }}
            />
          </div>
        </div>
      )}

      {historyItemId && historyItem && (
        <div className="academic-modal-overlay">
          <div className="academic-modal-card">
            <AcademicItemHistory
              itemId={historyItemId}
              sectionId={section.id}
              createdBy={historyItem.created_by}
              updatedBy={historyItem.updated_by}
              revisions={revisions}
              onClose={() => setHistoryItemId(null)}
            />
          </div>
        </div>
      )}

      <nav className="academic-workspace-nav" aria-label="Vistas del espacio">
        <button
          type="button"
          className={`academic-tab-btn ${viewMode === "all" ? "active" : ""}`}
          onClick={() => setViewMode("all")}
        >
          Todo ({items.length})
        </button>
        <button
          type="button"
          className={`academic-tab-btn ${viewMode === "notes" ? "active" : ""}`}
          onClick={() => setViewMode("notes")}
        >
          Apuntes ({items.filter((i) => i.item_type === "note").length})
        </button>
        <button
          type="button"
          className={`academic-tab-btn ${viewMode === "calendar" ? "active" : ""}`}
          onClick={() => setViewMode("calendar")}
        >
          Eventos y Recordatorios ({items.filter((i) => i.item_type === "event" || i.item_type === "reminder").length})
        </button>
        <button
          type="button"
          className={`academic-tab-btn ${viewMode === "tasks" ? "active" : ""}`}
          onClick={() => setViewMode("tasks")}
        >
          Tareas ({items.filter((i) => i.item_type === "task").length})
        </button>
        <button
          type="button"
          className={`academic-tab-btn ${viewMode === "evaluations" ? "active" : ""}`}
          onClick={() => setViewMode("evaluations")}
        >
          Evaluaciones ({items.filter((i) => i.item_type === "evaluation").length})
        </button>
      </nav>

      <section className="academic-items-stream" aria-labelledby="stream-heading">
        <h2 id="stream-heading" className="sr-only">Contenidos del grupo</h2>

        {filteredItems.length > 0 ? (
          <div className="academic-item-grid">
            {filteredItems.map((item) => (
              <article key={item.id} className="academic-content-card">
                <header className="academic-content-header">
                  <div className="academic-content-tags">
                    <span className={`academic-type-badge ${item.item_type}`}>
                      {item.item_type === "note" && "Apunte"}
                      {item.item_type === "event" && "Evento"}
                      {item.item_type === "reminder" && "Recordatorio"}
                      {item.item_type === "task" && "Tarea"}
                      {item.item_type === "evaluation" && "Evaluación"}
                    </span>
                    <span className={`academic-importance-badge ${item.importance}`}>
                      {item.importance}
                    </span>
                    <span className="academic-version-chip">v{item.version}</span>
                  </div>

                  <div className="academic-content-actions">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="academic-btn-quiet"
                      title="Editar contenido"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryItemId(item.id)}
                      className="academic-btn-quiet"
                      title="Ver historial de cambios"
                    >
                      Historial
                    </button>
                    <form action={async (formData: FormData) => { await softDeleteAcademicItem(formData); }}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="expectedVersion" value={item.version} />
                      <button
                        type="submit"
                        className="academic-btn-quiet academic-btn-danger"
                        title="Eliminar contenido"
                        onClick={(e) => {
                          if (!confirm("¿Seguro que deseas eliminar este contenido? Podrá ser restaurado desde el historial.")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </header>

                <h3 className="academic-content-title">{item.title}</h3>
                <p className="academic-content-body">{item.body}</p>

                <footer className="academic-content-footer">
                  {item.due_at && (
                    <span className="academic-due-time">
                      📅 Límite: {new Date(item.due_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                    </span>
                  )}
                  {item.starts_at && (
                    <span className="academic-starts-time">
                      🕒 Inicia: {new Date(item.starts_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                    </span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="academic-empty-state">
            <p>No hay contenidos registrados en esta vista todavía.</p>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsCreating(true);
              }}
              className="academic-btn academic-btn-secondary"
            >
              Crear el primer aporte para el grupo
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
