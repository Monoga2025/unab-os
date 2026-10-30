"use server";

import { revalidatePath } from "next/cache";
import {
  transitionStudySession,
  validateStudySessionTargetMinutes,
  type StudySessionStatus,
} from "@/lib/domain/study";
import { requireUser } from "@/lib/supabase/auth";

const MAX_SESSION_TITLE_LENGTH = 160;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function refreshStudyViews() {
  revalidatePath("/study");
  revalidatePath("/dashboard");
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createStudySession(formData: FormData): Promise<ActionResult> {
  const title = readString(formData, "title").trim();
  const plannedForValue = readString(formData, "plannedFor");
  const targetMinutesValue = readString(formData, "targetMinutes").trim();
  const targetMinutes = targetMinutesValue ? Number(targetMinutesValue) : null;
  const documentIds = formData.getAll("documentIds").filter((value): value is string => typeof value === "string");
  const uniqueDocumentIds = [...new Set(documentIds)];
  const plannedFor = new Date(plannedForValue);

  if (!title || title.length > MAX_SESSION_TITLE_LENGTH) return { ok: false, message: "Ingresá un tema de hasta 160 caracteres." };
  if (!plannedForValue || Number.isNaN(plannedFor.getTime())) return { ok: false, message: "Elegí una fecha y hora válidas." };
  if (!validateStudySessionTargetMinutes(targetMinutes)) return { ok: false, message: "La duración objetivo debe ser de entre 5 y 240 minutos." };
  if (uniqueDocumentIds.some((id) => !UUID_PATTERN.test(id))) return { ok: false, message: "La selección de documentos no es válida." };

  const { supabase, userId } = await requireUser();
  if (uniqueDocumentIds.length) {
    const { data: ownedDocuments, error: documentsError } = await supabase
      .from("study_documents")
      .select("id")
      .eq("user_id", userId)
      .in("id", uniqueDocumentIds);
    if (documentsError || ownedDocuments?.length !== uniqueDocumentIds.length) {
      return { ok: false, message: "Uno o más documentos seleccionados ya no están disponibles." };
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .insert({
      user_id: userId,
      title,
      status: "planned",
      planned_for: plannedFor.toISOString(),
      target_minutes: targetMinutes,
    })
    .select("id")
    .single();
  if (sessionError || !session) return { ok: false, message: "No se pudo planificar la sesión." };

  if (uniqueDocumentIds.length) {
    const { error: linksError } = await supabase.from("study_session_documents").insert(
      uniqueDocumentIds.map((documentId) => ({ user_id: userId, session_id: session.id, document_id: documentId })),
    );
    if (linksError) {
      await supabase.from("study_sessions").delete().eq("id", session.id).eq("user_id", userId);
      return { ok: false, message: "No se pudo vincular la selección de documentos." };
    }
  }

  refreshStudyViews();
  return { ok: true, message: "Sesión planificada." };
}

async function transitionSession(sessionId: string, nextStatus: StudySessionStatus): Promise<ActionResult> {
  if (!UUID_PATTERN.test(sessionId)) return { ok: false, message: "La sesión no es válida." };

  const { supabase, userId } = await requireUser();
  const { data: session, error } = await supabase
    .from("study_sessions")
    .select("id, status, planned_for, target_minutes, started_at, completed_at, cancelled_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !session) return { ok: false, message: "No se encontró la sesión." };

  let next;
  try {
    next = transitionStudySession({
      status: session.status as StudySessionStatus,
      plannedFor: session.planned_for,
      targetMinutes: session.target_minutes,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      cancelledAt: session.cancelled_at,
    }, nextStatus, new Date().toISOString());
  } catch {
    return { ok: false, message: "La sesión cambió de estado. Actualizá la página e intentá de nuevo." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("study_sessions")
    .update({
      status: next.status,
      started_at: next.startedAt,
      completed_at: next.completedAt,
      cancelled_at: next.cancelledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", session.status)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) return { ok: false, message: "No se pudo actualizar la sesión." };

  refreshStudyViews();
  const labels: Record<StudySessionStatus, string> = {
    planned: "Sesión planificada.",
    active: "Sesión iniciada.",
    completed: "Sesión completada.",
    cancelled: "Sesión cancelada.",
  };
  return { ok: true, message: labels[nextStatus] };
}

export async function startStudySession(sessionId: string) {
  return transitionSession(sessionId, "active");
}

export async function completeStudySession(sessionId: string) {
  return transitionSession(sessionId, "completed");
}

export async function cancelStudySession(sessionId: string) {
  return transitionSession(sessionId, "cancelled");
}
