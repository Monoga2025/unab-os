import type { AcademicMaterialEvidence, AcademicEvidenceKind } from "@/lib/domain/academic-material-analysis";
import { normalizeAcademicText } from "@/lib/domain/academic-material-analysis";
import type { TemaFile, TemaSection } from "@/lib/tema/data";

type BuildCourseAcademicEvidenceInput = Readonly<{
  courseId: string;
  courseName: string;
  sections: readonly TemaSection[];
  files: readonly TemaFile[];
  boundaryText?: string | null;
}>;

function evidenceKind(label: string): Exclude<AcademicEvidenceKind, "class_progress" | "boundary"> | null {
  const normalized = normalizeAcademicText(label);
  if (/\b(apunte|apuntes|notas? de clase)\b/.test(normalized)) return "notes";
  if (/\b(diapositiva|diapositivas|presentacion|presentaciones|slides?)\b/.test(normalized)) return "slides";
  if (/taller\s*parcial|tallerparcial|\b(parcial|evaluacion|examen|quiz)\b/.test(normalized)) return "assessment";
  if (/\b(fecha|fechas|cronograma|programacion|resumida|resumen del curso)\b/.test(normalized)) return "schedule";
  if (/\b(guia|guias|problema|problemas|taller|ejercicios?)\b/.test(normalized)) return "guide";
  return null;
}

/** Converts only verified extracted course text into analyzer evidence. */
export function buildCourseAcademicEvidence(input: BuildCourseAcademicEvidenceInput): readonly AcademicMaterialEvidence[] {
  const sectionById = new Map(input.sections.map((section) => [section.id, section]));
  const evidence = input.files.flatMap((file): AcademicMaterialEvidence[] => {
    if (file.textExtractionStatus !== "ready" || !file.extractedText?.trim()) return [];
    const section = sectionById.get(file.sectionId);
    const label = [section?.title, file.activityName, file.fileName].filter(Boolean).join(" · ");
    const kind = evidenceKind(label);
    if (!kind) return [];
    return [{
      sourceId: file.candidateId,
      kind,
      label,
      text: file.extractedText,
      order: section?.order,
    }];
  });

  const boundary = input.boundaryText?.trim();
  if (boundary) {
    const stableId = normalizeAcademicText(input.courseId).replace(/\s+/g, "-") || "course";
    evidence.push(
      { sourceId: `class-progress:${stableId}`, kind: "class_progress", label: `Avance de clase · ${input.courseName}`, text: boundary, order: Number.MAX_SAFE_INTEGER - 1 },
      { sourceId: `class-boundary:${stableId}`, kind: "boundary", label: "Quedamos hasta aquí", text: boundary, order: Number.MAX_SAFE_INTEGER },
    );
  }

  return Object.freeze(evidence.map((item) => Object.freeze(item)));
}
