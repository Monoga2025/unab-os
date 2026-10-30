"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";

const COURSE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_BOUNDARY_LENGTH = 4_000;

export type AcademicMapActionState = Readonly<{
  ok: boolean;
  message: string;
}>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCourseStudyBoundary(
  _previousState: AcademicMapActionState,
  formData: FormData,
): Promise<AcademicMapActionState> {
  const courseId = formString(formData, "courseId");
  const boundaryText = formString(formData, "boundaryText");
  if (!COURSE_ID_PATTERN.test(courseId)) return { ok: false, message: "La materia seleccionada no es válida." };
  if (!boundaryText || boundaryText.length > MAX_BOUNDARY_LENGTH || boundaryText.includes("\0")) {
    return { ok: false, message: "Escribí un avance de clase de entre 1 y 4000 caracteres." };
  }

  const { supabase, userId } = await requireUser();
  const { data: course, error: courseError } = await supabase.from("tema_courses").select("id")
    .eq("owner_id", userId).eq("catalog_visible", true).eq("source_id", courseId).maybeSingle();
  if (courseError || !course) return { ok: false, message: "La materia ya no está disponible en tu catálogo." };

  const now = new Date().toISOString();
  const { error } = await supabase.from("course_study_boundaries").upsert({
    owner_id: userId,
    course_source_id: courseId,
    boundary_text: boundaryText,
    updated_at: now,
  }, { onConflict: "owner_id,course_source_id" });
  if (error) return { ok: false, message: "No se pudo guardar el avance de clase." };

  revalidatePath(`/tema/course/${encodeURIComponent(courseId)}`);
  return { ok: true, message: "Avance de clase guardado. El mapa se actualizará con este corte." };
}
