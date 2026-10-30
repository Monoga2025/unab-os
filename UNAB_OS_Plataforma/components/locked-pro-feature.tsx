import Link from "next/link";

type Props = {
  title: string;
  description: string;
  badge?: string;
};

export function LockedProFeature({
  title,
  description,
  badge = "Función de Pago · Plan PRO",
}: Props) {
  return (
    <div className="pro-locked-container">
      <div className="pro-locked-card">
        <div className="pro-locked-icon-badge">
          <span className="pro-locked-lock-icon" aria-hidden="true">🔒</span>
          <span className="pro-locked-badge-pill">{badge}</span>
        </div>

        <h2 className="pro-locked-title">{title}</h2>
        <p className="pro-locked-description">{description}</p>

        <div className="pro-locked-benefits-grid">
          <div className="pro-locked-benefit-item">
            <span className="pro-benefit-check">✓</span>
            <div>
              <strong>Tutor IA Proactivo</strong>
              <p>Resolución guiada paso a paso y práctica con tus apuntes reales.</p>
            </div>
          </div>
          <div className="pro-locked-benefit-item">
            <span className="pro-benefit-check">✓</span>
            <div>
              <strong>Sincronización Total con Moodle TEMA</strong>
              <p>Descarga automática de PDFs, fechas y quices de tus cursos.</p>
            </div>
          </div>
          <div className="pro-locked-benefit-item">
            <span className="pro-benefit-check">✓</span>
            <div>
              <strong>Jarvis en Telegram</strong>
              <p>Recordatorios interactivos y preparación antes de cada entrega.</p>
            </div>
          </div>
        </div>

        <div className="pro-locked-action-box">
          <Link href="/materias" className="academic-btn academic-btn-primary academic-btn-lg">
            Ir a Mis Materias Gratuitas ➔
          </Link>
        </div>
      </div>
    </div>
  );
}
