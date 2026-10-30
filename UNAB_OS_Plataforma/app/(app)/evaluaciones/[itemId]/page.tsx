import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvaluationDetail } from "@/lib/academic-collaboration/queries";
import { formatBogotaDateTime } from "@/lib/academic-collaboration/dates";
import { requireInstitutionalUser } from "@/lib/supabase/auth";

type Props = {
  params: Promise<{ itemId: string }>;
};

export default async function EvaluationDetailPage({ params }: Props) {
  await requireInstitutionalUser();
  const { itemId } = await params;

  const item = await getEvaluationDetail(itemId);
  if (!item) notFound();

  const section = item.class_sections;
  const subjectName = section?.subjects?.display_name ?? "Materia";
  const professorName = section?.professors?.display_name ?? "Profesor/a";

  return (
    <main className="academic-page-container">
      <div className="academic-workspace">
        <header className="academic-workspace-header">
          <div>
            <nav className="academic-breadcrumb" aria-label="Ruta de navegación">
              <Link href="/evaluaciones" className="academic-breadcrumb-link">
                ← Volver al Calendario de Evaluaciones
              </Link>
            </nav>
            <h1 className="academic-heading">{item.title}</h1>
            <p className="academic-subheading">
              {subjectName} · Prof. {professorName} · Período {section?.term}
            </p>
          </div>

          <div className="academic-workspace-header-actions">
            <Link
              href={`/section/${item.section_id}`}
              className="academic-btn academic-btn-secondary"
            >
              Ir al espacio de clase
            </Link>
          </div>
        </header>

        <article className="academic-eval-detail-card">
          <div className="academic-eval-detail-meta">
            <div className="academic-content-tags">
              <span className={`academic-type-badge ${item.item_type}`}>Evaluación</span>
              <span className={`academic-importance-badge ${item.importance}`}>
                Importancia: {item.importance}
              </span>
              <span className="academic-version-chip">Versión {item.version}</span>
            </div>

            {item.due_at && (
              <p className="academic-due-time-prominent">
                📅 <strong>Fecha programada:</strong> {formatBogotaDateTime(item.due_at)}
              </p>
            )}
          </div>

          <section className="academic-eval-section" aria-labelledby="instrucciones-heading">
            <h2 id="instrucciones-heading" className="academic-section-title">
              Instrucciones y alcance de la prueba
            </h2>
            <div className="academic-content-body">
              {item.body}
            </div>
          </section>

          <section className="academic-eval-section" aria-labelledby="ejercicios-heading">
            <h2 id="ejercicios-heading" className="academic-section-title">
              Ejercicios y temas clave
            </h2>
            <p className="academic-help-text">
              Orientaciones colaborativas registradas para esta evaluación (ej. Banco de talleres, ejercicios recomendados o formato de puntos a resolver).
            </p>
            <div className="academic-eval-exercises-box">
              <p>Revisá el contenido y los apuntes asociados en el espacio del grupo para practicar los ejercicios prioritarios.</p>
            </div>
          </section>

          <footer className="academic-eval-footer">
            <p className="academic-meta-line">
              Registrado por <strong>{item.created_by}</strong> · Última actualización por <strong>{item.updated_by}</strong> el {formatBogotaDateTime(item.updated_at)}
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
