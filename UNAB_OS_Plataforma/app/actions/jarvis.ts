"use server";

import { revalidatePath } from "next/cache";
import { queueCloudJarvisHandoff } from "@/lib/jarvis/cloud";
import { requireUser } from "@/lib/supabase/auth";
import { getTemaFileByCandidateId } from "@/lib/tema/data";
import { loadTemaData } from "@/lib/tema/data";
import { resolveStudyMaterial } from "@/lib/tema/workspace";

const CANDIDATE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_LABEL_LENGTH = 180;
const MAX_TELEGRAM_DOCUMENT_BYTES = 10_000_000;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validLabel(value: string): boolean {
  return value.length > 0 && value.length <= MAX_LABEL_LENGTH && !value.includes("\0");
}

export async function sendStudyMaterialWithJarvis(formData: FormData): Promise<void> {
  const candidateId = formString(formData, "candidateId");
  if (!CANDIDATE_PATTERN.test(candidateId)) {
    throw new Error("El material seleccionado para Jarvis no es válido.");
  }

  const { supabase, userId } = await requireUser();
  const [file, data, telegramLinkResult] = await Promise.all([
    getTemaFileByCandidateId(candidateId, userId),
    loadTemaData(userId),
    supabase.from("telegram_links").select("id").eq("owner_id", userId).is("unlinked_at", null).maybeSingle(),
  ]);
  if (telegramLinkResult.error) throw new Error("No se pudo verificar tu enlace privado con Telegram.");
  if (!telegramLinkResult.data) {
    throw new Error("Conecta Telegram desde Inicio, genera un código y envía /link CODIGO a Jarvis antes de iniciar la sesión.");
  }
  if (!file || file.status !== "downloaded" || file.bytes < 1 || file.bytes > MAX_TELEGRAM_DOCUMENT_BYTES) {
    throw new Error("El archivo no está disponible para enviarlo por Telegram.");
  }
  const subject = data.courses.find((course) => course.id === file.courseId)?.name ?? "Materia";
  const topic = file.activityName;
  const title = file.fileName;
  if (![subject, topic, title].every(validLabel)) throw new Error("El material tiene metadatos inválidos.");

  const { data: cloudFile, error: cloudFileError } = await supabase.from("tema_files")
    .select("id,course_id,section_id,activity_name")
    .eq("owner_id", userId).eq("catalog_visible", true).eq("candidate_id", candidateId).single();
  if (cloudFileError || !cloudFile) throw new Error("El material privado ya no está disponible.");
  const { data: activity } = await supabase.from("tema_activities").select("id")
    .eq("owner_id", userId).eq("catalog_visible", true).eq("course_id", cloudFile.course_id).eq("section_id", cloudFile.section_id)
    .eq("name", cloudFile.activity_name).maybeSingle();
  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await supabase.from("study_sessions").insert({
    user_id: userId,
    title: `Estudiar ${topic}`.slice(0, 160),
    status: "active",
    planned_for: now,
    target_minutes: 45,
    started_at: now,
    tema_course_id: cloudFile.course_id,
    tema_activity_id: activity?.id ?? null,
  }).select("id").single();
  if (sessionError || !session) throw new Error("No se pudo iniciar la sesión de estudio.");
  const { error: linkError } = await supabase.from("study_session_tema_files").insert({
    user_id: userId,
    session_id: session.id,
    file_id: cloudFile.id,
  });
  if (linkError) {
    await supabase.from("study_sessions").delete().eq("id", session.id).eq("user_id", userId);
    throw new Error("No se pudo vincular el material a la sesión.");
  }

  try {
    await queueCloudJarvisHandoff({
      supabase,
      ownerId: userId,
      candidateId,
      title,
      subject,
      topic,
      studySessionId: session.id,
    });
  } catch (error) {
    await supabase.from("study_sessions").delete().eq("id", session.id).eq("user_id", userId);
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/study");
  revalidatePath("/progress");
  revalidatePath(`/tema/course/${encodeURIComponent(file.courseId)}`);
}

export type JarvisMaterialOption = Readonly<{
  candidateId: string;
  title: string;
  subject: string;
  topic: string;
}>;

export async function resolveJarvisMaterialRequest(query: string): Promise<{
  kind: "none" | "single" | "multiple";
  matches: JarvisMaterialOption[];
}> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 180 || trimmed.includes("\0")) return { kind: "none", matches: [] };
  const { userId } = await requireUser();
  const data = await loadTemaData(userId);
  const courseById = new Map(data.courses.map((course) => [course.id, course.name]));
  const resolution = resolveStudyMaterial(data, trimmed);
  return {
    kind: resolution.kind,
    matches: resolution.matches.map((file) => ({
      candidateId: file.candidateId,
      title: file.fileName,
      subject: courseById.get(file.courseId) ?? "Materia",
      topic: file.activityName,
    })),
  };
}
