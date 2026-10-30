import Link from "next/link";
import { getTemaActivities, getTemaCourse, getTemaSections, loadTemaData } from "@/lib/tema/data";
import { classifyTemaActivity, parseTemaAvailability } from "@/lib/tema/dates";
import { requireUser } from "@/lib/supabase/auth";
import { sendStudyMaterialWithJarvis } from "@/app/actions/jarvis";
import { CourseStudyMap } from "@/components/course-study-map";
import { analyzeAcademicMaterials } from "@/lib/domain/academic-material-analysis";
import { buildCourseAcademicEvidence } from "@/lib/tema/academic-evidence";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const statusCopy = {
  graded: "Calificada",
  submitted: "Entregada",
  overdue: "Vencida con evidencia",
  upcoming: "Próxima",
  undated: "Sin fecha",
  historical: "Histórica",
};

type DisplayStatus = keyof typeof statusCopy;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TemaCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase, userId } = await requireUser();
  const [course, sections, activities, allData, boundaryResult] = await Promise.all([
    getTemaCourse(courseId, userId),
    getTemaSections(courseId, userId),
    getTemaActivities(courseId, undefined, userId),
    loadTemaData(userId),
    supabase.from("course_study_boundaries").select("boundary_text")
      .eq("owner_id", userId).eq("course_source_id", courseId).maybeSingle(),
  ]);

  if (!course) return <main className="tema-detail"><section className="tema-card tema-not-found"><p className="section-label">TEMA</p><h1>Materia no encontrada</h1><p>El identificador no corresponde a una materia de tu catálogo privado.</p><Link href="/tema">Volver a Materias</Link></section></main>;

  const now = Date.now();
  const orderedSections = [...sections].sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "es"));
  const courseFiles = allData.files.filter((file) => file.courseId === courseId);
  const courseGrades = (allData.grades ?? []).filter((grade) => grade.courseId === courseId);
  const announcements = (allData.announcements ?? []).filter((announcement) => announcement.courseId === courseId).slice(0, 10);
  const sectionActivityCount = (sectionId: string) => activities.filter((activity) => activity.sectionId === sectionId).length;
  const boundaryText = boundaryResult.error ? null : boundaryResult.data?.boundary_text ?? null;
  const academicEvidence = buildCourseAcademicEvidence({ courseId, courseName: course.name, sections, files: courseFiles, boundaryText });
  const academicMap = analyzeAcademicMaterials(course.name, academicEvidence);
  const academicSources = academicEvidence.map((evidence) => {
    const file = courseFiles.find((candidate) => candidate.candidateId === evidence.sourceId);
    return {
      sourceId: evidence.sourceId,
      label: file?.fileName ?? evidence.label,
      href: file ? `/api/tema/files/${encodeURIComponent(file.candidateId)}` : null,
    };
  });
  const ocrNeededLabels = courseFiles.filter((file) => file.textExtractionStatus === "ocr_needed").map((file) => file.fileName);

  return <main className="tema-detail">
    <nav className="tema-breadcrumb" aria-label="Migas de pan"><Link href="/tema">Materias</Link><span aria-hidden="true">/</span><span aria-current="page">{course.name}</span></nav>
    <header className="tema-detail-hero">
      <div><p className="dashboard-kicker">Tu espacio de materia</p><h1>{course.name}</h1><p>{course.summaryText || "Contenido oficial organizado para consultar, estudiar y llegar a la actividad exacta en TEMA cuando debas entregar o responder."}</p><div className="tema-official-actions">{course.officialUrl && <a href={course.officialUrl} target="_blank" rel="noreferrer">Abrir materia exacta en TEMA ↗</a>}</div>{course.accessFailed && <span className="tema-access-warning">La captura reportó acceso parcial a esta materia.</span>}</div>
      <dl><div><dt>Secciones</dt><dd>{orderedSections.length}</dd></div><div><dt>Actividades</dt><dd>{activities.length}</dd></div><div><dt>Notas publicadas</dt><dd>{courseGrades.filter((grade) => grade.gradeDisplay !== null).length}</dd></div><div><dt>Recursos</dt><dd>{courseFiles.length}</dd></div></dl>
    </header>

    <CourseStudyMap
      courseId={courseId}
      rows={academicMap}
      sources={academicSources}
      boundaryText={boundaryText}
      ocrNeededLabels={ocrNeededLabels}
    />

    <section className="tema-course-overview" aria-label="Resumen de la materia">
      <article className="tema-card tema-announcements"><div className="tema-card-heading"><div><p className="section-label">Comunicación</p><h2>Avisos recientes</h2></div><span>{announcements.length}</span></div>{announcements.length ? <ol>{announcements.map((announcement) => <li key={announcement.id}><div><strong>{announcement.title}</strong>{announcement.authorName && <small>{announcement.authorName}</small>}</div>{announcement.excerpt && <p>{announcement.excerpt}</p>}<a href={announcement.officialUrl} target="_blank" rel="noreferrer">Ver aviso en TEMA ↗</a></li>)}</ol> : <p className="tema-empty">No hay avisos disponibles en la captura. Si TEMA bloquea esta API, conservaremos el último resultado válido.</p>}</article>
      <article className="tema-card tema-grades"><div className="tema-card-heading"><div><p className="section-label">Tal como aparece en TEMA</p><h2>Notas publicadas</h2></div><span>{courseGrades.length}</span></div>{courseGrades.length ? <ul>{courseGrades.map((grade) => <li key={grade.id}><span><strong>{grade.name}</strong><small>{grade.moduleType || grade.itemType}</small></span><b>{grade.gradeDisplay || "Sin nota publicada"}</b></li>)}</ul> : <p className="tema-empty">Todavía no se capturaron ítems de calificación.</p>}{courseGrades.find((grade) => grade.officialUrl)?.officialUrl && <a className="tema-grades-link" href={courseGrades.find((grade) => grade.officialUrl)!.officialUrl!} target="_blank" rel="noreferrer">Abrir calificaciones exactas en TEMA ↗</a>}<p className="tema-method-note">No calculamos ni promediamos: mostramos el valor crudo publicado por TEMA.</p></article>
    </section>

    <section className="tema-section-index" aria-labelledby="tema-index-title"><div><p className="section-label">Orden del curso</p><h2 id="tema-index-title">Secciones</h2></div><ol>{orderedSections.map((section, index) => <li key={section.id}><a href={`#section-${encodeURIComponent(section.id)}`}><span>{index + 1}</span><strong>{section.title}</strong><small>{sectionActivityCount(section.id)} actividades</small></a></li>)}</ol></section>

    <div className="tema-section-stack">{orderedSections.map((section, sectionIndex) => {
      const sectionActivities = activities.filter((activity) => activity.sectionId === section.id);
      return <section className="tema-section-card" id={`section-${encodeURIComponent(section.id)}`} aria-labelledby={`section-title-${encodeURIComponent(section.id)}`} key={section.id}>
        <header><span>{sectionIndex + 1}</span><div><p className="section-label">Sección {section.order}</p><h2 id={`section-title-${encodeURIComponent(section.id)}`}>{section.title}</h2></div><small>{sectionActivities.length} actividades</small></header>
        {sectionActivities.length ? <ol className="tema-activity-list">{sectionActivities.map((activity) => {
          const classification = classifyTemaActivity(activity.availabilityText, now);
          const status: DisplayStatus = classification.status === "unknown"
            ? (!classification.closesAt ? "undated" : classification.closesAt.timestamp <= now ? "historical" : "upcoming")
            : classification.status;
          const opensAt = activity.availabilityText.map((text) => parseTemaAvailability(text).opensAt).find((date) => date !== null) ?? null;
          const activityFiles = courseFiles.filter((file) => file.activityId ? file.activityId === activity.id : file.sectionId === section.id && file.activityName === activity.name);
          const rubricFiles = activityFiles.filter((file) => /r[uú]brica|rubric/i.test(`${file.fileName} ${file.fileType}`));
          const resourceFiles = activityFiles.filter((file) => !rubricFiles.includes(file));
          return <li className="tema-activity" key={activity.id}>
            <div className="tema-activity-heading"><div><span className={`tema-status ${status}`}>{statusCopy[status]}</span><span className="tema-module-type">{activity.moduleType}</span></div><h3>{activity.name}</h3>{activity.descriptionText && <p>{activity.descriptionText}</p>}{activity.officialUrl && <a className="tema-activity-official" href={activity.officialUrl} target="_blank" rel="noreferrer">Abrir actividad exacta en TEMA ↗</a>}</div>
            <dl className="tema-availability"><div><dt>Disponible desde</dt><dd>{opensAt ? <time dateTime={opensAt.iso}>{dateFormatter.format(new Date(opensAt.iso))}</time> : "Sin apertura capturada"}</dd></div><div><dt>Cierre</dt><dd>{classification.closesAt ? <time dateTime={classification.closesAt.iso}>{dateFormatter.format(new Date(classification.closesAt.iso))}</time> : "Sin cierre capturado"}</dd></div></dl>
            <div className="tema-resource-grid">
              <section aria-label={`Recursos de ${activity.name}`}><h4>Recursos</h4>{resourceFiles.length ? <ul>{resourceFiles.map((file) => <li key={file.candidateId}><span><strong>{file.fileName}</strong><small>{file.fileType.toLocaleUpperCase("es")} · {formatBytes(file.bytes)}</small></span><div className="tema-resource-actions"><a href={`/api/tema/files/${encodeURIComponent(file.candidateId)}`} target="_blank" rel="noreferrer">Abrir</a>{file.contentType === "application/pdf" && file.bytes <= 10_000_000 && <form action={sendStudyMaterialWithJarvis}><input type="hidden" name="candidateId" value={file.candidateId} /><button type="submit">Estudiar con Jarvis</button></form>}</div></li>)}</ul> : <p>{activity.candidateNames.length ? `${activity.candidateNames.length} recursos referenciados sin copia local disponible.` : "No hay recursos capturados para esta actividad."}</p>}</section>
              <section aria-label={`Rúbricas de ${activity.name}`}><h4>Rúbricas</h4>{rubricFiles.length ? <ul>{rubricFiles.map((file) => <li key={file.candidateId}><span><strong>{file.fileName}</strong><small>{file.fileType.toLocaleUpperCase("es")} · {formatBytes(file.bytes)}</small></span><a href={`/api/tema/files/${encodeURIComponent(file.candidateId)}`} target="_blank" rel="noreferrer">Abrir</a></li>)}</ul> : <p>No hay una rúbrica identificable en la captura.</p>}</section>
            </div>
          </li>;
        })}</ol> : <p className="tema-empty">Esta sección no contiene actividades en la captura.</p>}
      </section>;
    })}</div>

    <p className="tema-method-note">“Histórica” significa que la fecha capturada ya pasó, pero no existe evidencia suficiente para afirmar atraso. Solo se usa “Vencida” cuando la captura lo indica explícitamente.</p>
  </main>;
}
