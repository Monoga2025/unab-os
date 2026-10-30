"use server";

import { revalidatePath } from "next/cache";
import {
  ACADEMIC_IMPORTANCE,
  ACADEMIC_ITEM_TYPES,
  type AcademicActionState,
  type AcademicImportance,
  type AcademicItemInput,
  type AcademicItemType,
  validateAcademicItem,
} from "@/lib/domain/academic-collaboration";
import { normalizeCatalogKey } from "@/lib/domain/academic-collaboration";
import { requireInstitutionalUser } from "@/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNAVAILABLE: AcademicActionState = { ok: false, message: "Contenido no disponible." };

type ValidItemInput = AcademicItemInput & { itemId?: string; expectedVersion: number | null };

function value(formData: FormData, name: string): string | null {
  const candidate = formData.get(name);
  return typeof candidate === "string" ? candidate : null;
}

function isUuid(candidate: string | null): candidate is string {
  return candidate !== null && UUID_PATTERN.test(candidate);
}

function isItemType(candidate: string | null): candidate is AcademicItemType {
  return candidate !== null && (ACADEMIC_ITEM_TYPES as readonly string[]).includes(candidate);
}

function isImportance(candidate: string | null): candidate is AcademicImportance {
  return candidate !== null && (ACADEMIC_IMPORTANCE as readonly string[]).includes(candidate);
}

function parseTimestamp(candidate: string | null): string | null | undefined {
  if (candidate === null || candidate.trim() === "") return null;
  return Number.isNaN(new Date(candidate).getTime()) ? undefined : candidate;
}

function validationState(fieldErrors: Record<string, string>): AcademicActionState {
  return { ok: false, message: "Revisá los campos marcados.", fieldErrors };
}

function parseAcademicItem(formData: FormData, includeItemId = false): ValidItemInput | AcademicActionState {
  const sectionId = value(formData, "sectionId");
  const itemType = value(formData, "itemType");
  const importance = value(formData, "importance") ?? "normal";
  const title = value(formData, "title")?.trim() ?? "";
  const body = value(formData, "body")?.trim() ?? "";
  const startsAt = parseTimestamp(value(formData, "startsAt"));
  const dueAt = parseTimestamp(value(formData, "dueAt"));
  const expectedVersionValue = value(formData, "expectedVersion");
  const itemId = includeItemId ? value(formData, "itemId") : undefined;
  const fieldErrors: Record<string, string> = {};

  if (!isUuid(sectionId)) fieldErrors.sectionId = "La sección no es válida.";
  if (!isItemType(itemType)) fieldErrors.itemType = "El tipo de contenido no es válido.";
  if (!isImportance(importance)) fieldErrors.importance = "La importancia no es válida.";
  if (title.length === 0 || title.length > 240) fieldErrors.title = "Ingresá un título de hasta 240 caracteres.";
  if (body.length === 0 || body.length > 5000) fieldErrors.body = "Ingresá un contenido de hasta 5000 caracteres.";
  if (startsAt === undefined) fieldErrors.startsAt = "Ingresá una fecha válida.";
  if (dueAt === undefined) fieldErrors.dueAt = "Ingresá una fecha válida.";
  if (includeItemId && !isUuid(itemId ?? null)) fieldErrors.itemId = "El contenido no es válido.";

  const expectedVersion = expectedVersionValue === null || expectedVersionValue === ""
    ? null
    : Number(expectedVersionValue);
  if (includeItemId && (!Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1)) {
    fieldErrors.expectedVersion = "La versión no es válida.";
  }

  if (Object.keys(fieldErrors).length > 0 || !sectionId || !itemType || !isImportance(importance) || startsAt === undefined || dueAt === undefined) {
    return validationState(fieldErrors);
  }

  const input: ValidItemInput = {
    sectionId,
    itemType: itemType as AcademicItemType,
    title,
    body,
    importance,
    startsAt,
    dueAt,
    expectedVersion,
    ...(includeItemId ? { itemId: itemId! } : {}),
  };
  const domainErrors = validateAcademicItem(input);
  return Object.keys(domainErrors).length > 0 ? validationState({ ...domainErrors }) : input;
}

function isActionState(value: ValidItemInput | AcademicActionState): value is AcademicActionState {
  return "ok" in value;
}

function isConflict(error: { code?: string | null; message?: string | null } | null) {
  return error?.code === "ACV01" || error?.message === "academic item version conflict";
}

function isUnavailable(error: { code?: string | null } | null) {
  return error?.code === "42501" || error?.code === "P0002";
}

function revalidateAcademicPaths(sectionId: string, itemId?: string) {
  revalidatePath("/materias");
  revalidatePath(`/section/${sectionId}`);
  revalidatePath("/evaluaciones");
  if (itemId) revalidatePath(`/evaluaciones/${itemId}`);
  revalidatePath("/dashboard");
}

async function conflictState(
  supabase: Awaited<ReturnType<typeof requireInstitutionalUser>>["supabase"],
  itemId: string,
  attemptedBody: string,
): Promise<AcademicActionState> {
  const { data, error } = await supabase
    .from("academic_items")
    .select("version,body")
    .eq("id", itemId)
    .eq("deleted_at", null)
    .maybeSingle();

  if (error || !data) return UNAVAILABLE;
  return {
    ok: false,
    message: "El contenido fue actualizado por otra persona.",
    conflict: {
      currentVersion: data.version,
      currentBody: data.body,
      attemptedBody,
    },
  };
}

async function catalogFallback(
  supabase: Awaited<ReturnType<typeof requireInstitutionalUser>>["supabase"],
  kind: "subject" | "professor",
  displayName: string,
): Promise<boolean> {
  const table = kind === "subject" ? "subjects" : "professors";
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("normalized_key", normalizeCatalogKey(displayName))
    .is("retired_at", null)
    .maybeSingle();
  return Boolean(data);
}

export async function findOrCreateCatalogEntry(formData: FormData): Promise<AcademicActionState> {
  const kind = value(formData, "kind");
  const displayName = value(formData, "displayName")?.trim() ?? "";
  if ((kind !== "subject" && kind !== "professor") || displayName.length === 0 || displayName.length > 160) {
    return validationState({ displayName: "Ingresá un nombre de hasta 160 caracteres." });
  }

  const { supabase } = await requireInstitutionalUser();
  const rpcName = kind === "subject" ? "create_or_get_subject" : "create_or_get_professor";
  const { error } = await supabase.rpc(rpcName, { p_display_name: displayName });
  if (error && !(await catalogFallback(supabase, kind, displayName))) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo guardar el catálogo." };

  revalidatePath("/materias");
  return { ok: true, message: "Entrada de catálogo disponible." };
}

export async function findOrCreateSection(formData: FormData): Promise<AcademicActionState> {
  const subjectId = value(formData, "subjectId");
  const professorId = value(formData, "professorId");
  const term = value(formData, "term")?.trim() ?? "";
  if (!isUuid(subjectId) || !isUuid(professorId) || term.length === 0 || term.length > 32) {
    return validationState({ section: "Seleccioná una materia, profesor y período válidos." });
  }

  const { supabase } = await requireInstitutionalUser();
  const { data, error } = await supabase.rpc("create_or_get_class_section", {
    p_subject_id: subjectId,
    p_professor_id: professorId,
    p_term: term,
  });
  if (error || !data) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo crear la sección." };

  revalidateAcademicPaths(data);
  return { ok: true, message: "Sección disponible." };
}

export async function joinSection(formData: FormData): Promise<AcademicActionState> {
  const sectionId = value(formData, "sectionId");
  if (!isUuid(sectionId)) return validationState({ sectionId: "La sección no es válida." });

  const { supabase, userId } = await requireInstitutionalUser();
  const { error } = await supabase
    .from("section_memberships")
    .upsert({ section_id: sectionId, user_id: userId, created_by: userId, left_at: null }, { onConflict: "section_id,user_id" });
  if (error && error.code !== "23505") return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo unir a la sección." };

  revalidateAcademicPaths(sectionId);
  return { ok: true, message: "Te uniste a la sección." };
}

export async function leaveSection(formData: FormData): Promise<AcademicActionState> {
  const sectionId = value(formData, "sectionId");
  if (!isUuid(sectionId)) return validationState({ sectionId: "La sección no es válida." });

  const { supabase, userId } = await requireInstitutionalUser();
  const { error } = await supabase
    .from("section_memberships")
    .update({ left_at: new Date().toISOString() })
    .eq("section_id", sectionId)
    .eq("user_id", userId);

  if (error) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo salir de la sección." };

  revalidateAcademicPaths(sectionId);
  return { ok: true, message: "Saliste de la sección." };
}

export async function enrollInMultipleSubjects(
  enrollments: Array<{
    subjectId?: string;
    subjectName?: string;
    professorId?: string;
    professorName?: string;
    term: string;
  }>
): Promise<AcademicActionState> {
  if (!enrollments.length) return { ok: false, message: "Selecciona al menos una materia." };

  const { supabase, userId } = await requireInstitutionalUser();

  for (const item of enrollments) {
    let resolvedSubjectId = isUuid(item.subjectId ?? null) ? item.subjectId! : null;
    let resolvedProfessorId = isUuid(item.professorId ?? null) ? item.professorId! : null;

    if (!resolvedSubjectId && item.subjectName?.trim()) {
      const { data: createdSubjId } = await supabase.rpc("create_or_get_subject", {
        p_display_name: item.subjectName.trim(),
      });
      if (createdSubjId && isUuid(createdSubjId)) {
        resolvedSubjectId = createdSubjId;
      }
    }

    if (item.professorName?.trim()) {
      const { data: createdProfId } = await supabase.rpc("create_or_get_professor", {
        p_display_name: item.professorName.trim(),
      });
      if (createdProfId && isUuid(createdProfId)) {
        resolvedProfessorId = createdProfId;
      }
    } else if (!resolvedProfessorId) {
      const { data: defaultProfId } = await supabase.rpc("create_or_get_professor", {
        p_display_name: "Docente Titular",
      });
      if (defaultProfId && isUuid(defaultProfId)) {
        resolvedProfessorId = defaultProfId;
      }
    }

    if (!resolvedSubjectId || !resolvedProfessorId) continue;

    const { data: sectionId } = await supabase.rpc("create_or_get_class_section", {
      p_subject_id: resolvedSubjectId,
      p_professor_id: resolvedProfessorId,
      p_term: item.term,
    });

    if (sectionId && isUuid(sectionId)) {
      await supabase
        .from("section_memberships")
        .upsert({ section_id: sectionId, user_id: userId, created_by: userId, left_at: null }, { onConflict: "section_id,user_id" });
      revalidateAcademicPaths(sectionId);
    }
  }

  revalidatePath("/materias");
  revalidatePath("/dashboard");
  revalidatePath("/evaluaciones");
  revalidatePath("/study");

  return { ok: true, message: "Materias inscritas con éxito." };
}

export async function createAcademicItem(formData: FormData): Promise<AcademicActionState> {
  const parsed = parseAcademicItem(formData);
  if (isActionState(parsed)) return parsed;

  const { supabase, userId } = await requireInstitutionalUser();
  const { data, error } = await supabase
    .from("academic_items")
    .insert({
      section_id: parsed.sectionId,
      item_type: parsed.itemType,
      title: parsed.title,
      body: parsed.body,
      importance: parsed.importance,
      starts_at: parsed.startsAt,
      due_at: parsed.dueAt,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo crear el contenido." };

  revalidateAcademicPaths(parsed.sectionId, data.id);
  return { ok: true, message: "Contenido creado." };
}

export async function updateAcademicItem(formData: FormData): Promise<AcademicActionState> {
  const parsed = parseAcademicItem(formData, true);
  if (isActionState(parsed)) return parsed;

  const { supabase } = await requireInstitutionalUser();
  const { data, error } = await supabase.rpc("update_academic_item", {
    p_item_id: parsed.itemId,
    p_title: parsed.title,
    p_body: parsed.body,
    p_importance: parsed.importance,
    p_starts_at: parsed.startsAt,
    p_due_at: parsed.dueAt,
    p_expected_version: parsed.expectedVersion,
  });
  if (isConflict(error)) return conflictState(supabase, parsed.itemId!, parsed.body);
  if (error) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo actualizar el contenido." };

  const targetSectionId = (data as { section_id?: string } | null)?.section_id ?? parsed.sectionId;
  revalidateAcademicPaths(targetSectionId, parsed.itemId);
  return { ok: true, message: "Contenido actualizado." };
}

async function mutateDeletedItem(formData: FormData, rpcName: "soft_delete_academic_item" | "restore_academic_item", successMessage: string): Promise<AcademicActionState> {
  const itemId = value(formData, "itemId");
  const sectionId = value(formData, "sectionId");
  const expectedVersion = Number(value(formData, "expectedVersion"));
  if (!isUuid(itemId) || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return validationState({ item: "El contenido o su versión no son válidos." });
  }

  const { supabase } = await requireInstitutionalUser();
  const { data, error } = await supabase.rpc(rpcName, { p_item_id: itemId, p_expected_version: expectedVersion });
  if (isConflict(error)) return conflictState(supabase, itemId, "");
  if (error) return isUnavailable(error) ? UNAVAILABLE : { ok: false, message: "No se pudo modificar el contenido." };

  let targetSectionId = (data as { section_id?: string } | null)?.section_id;
  if (!targetSectionId) {
    const revision = await supabase
      .from("academic_item_revisions")
      .select("section_id")
      .eq("academic_item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    targetSectionId = revision.data?.section_id;
  }

  if (targetSectionId) {
    revalidateAcademicPaths(targetSectionId, itemId);
  } else if (sectionId && isUuid(sectionId)) {
    revalidateAcademicPaths(sectionId, itemId);
  }
  return { ok: true, message: successMessage };
}

export async function softDeleteAcademicItem(formData: FormData): Promise<AcademicActionState> {
  return mutateDeletedItem(formData, "soft_delete_academic_item", "Contenido eliminado.");
}

export async function restoreAcademicItem(formData: FormData): Promise<AcademicActionState> {
  return mutateDeletedItem(formData, "restore_academic_item", "Contenido restaurado.");
}