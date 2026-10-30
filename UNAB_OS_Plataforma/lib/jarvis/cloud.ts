import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildJarvisStudyPrompt,
  jarvisHandoffSchema,
  jarvisReportEnvelopeSchema,
  parseJarvisStudyHandoff,
  parseJarvisStudyReport,
  type JarvisStudyHandoff,
  type JarvisStudyReportEnvelope,
} from "@/lib/domain/jarvis";
import type { JarvisBridgeSnapshot, JarvisBridgeStatus } from "./bridge";

type HandoffRow = Record<string, unknown>;

export const jarvisDocumentSnapshotSelect = "tema_course_id,document_storage_bucket,document_storage_object_name,document_file_name,document_content_type,document_size_bytes,document_sha256" as const;

export const temaFileSnapshotSelect = "id,course_id,storage_bucket,storage_object_name,file_name,content_type,size_bytes,sha256" as const;

export function snapshotTemaFile(file: Record<string, unknown>) {
  return {
    tema_course_id: file.course_id,
    document_storage_bucket: file.storage_bucket,
    document_storage_object_name: file.storage_object_name,
    document_file_name: file.file_name,
    document_content_type: file.content_type,
    document_size_bytes: file.size_bytes,
    document_sha256: file.sha256,
  };
}

export async function queueCloudJarvisHandoff(input: {
  supabase: SupabaseClient;
  ownerId: string;
  candidateId: string;
  title: string;
  subject: string;
  topic: string;
  studySessionId?: string;
}): Promise<string> {
  const [fileResult, linkResult] = await Promise.all([
    input.supabase.from("tema_files").select(temaFileSnapshotSelect)
      .eq("owner_id", input.ownerId).eq("catalog_visible", true).eq("candidate_id", input.candidateId).single(),
    input.supabase.from("telegram_links").select("id,telegram_user_id,telegram_chat_id")
      .eq("owner_id", input.ownerId).is("unlinked_at", null).maybeSingle(),
  ]);
  const { data: file, error: fileError } = fileResult;
  if (fileError || !file) throw new Error("El archivo privado no existe en la nube.");
  if (linkResult.error) throw new Error("No se pudo verificar tu enlace privado con Telegram.");
  if (!linkResult.data) {
    throw new Error("Conecta Telegram desde Inicio, genera un código y envía /link CODIGO a Jarvis antes de estudiar.");
  }
  const id = randomUUID();
  const { error } = await input.supabase.from("jarvis_study_handoffs").insert({
    id,
    owner_id: input.ownerId,
    file_id: file.id,
    ...snapshotTemaFile(file as Record<string, unknown>),
    title: input.title,
    subject: input.subject,
    topic: input.topic,
    prompt: buildJarvisStudyPrompt({ handoffId: id, subject: input.subject, topic: input.topic }),
    status: "queued",
    study_session_id: input.studySessionId ?? null,
    telegram_link_id: linkResult.data.id,
    telegram_recipient_user_id: linkResult.data.telegram_user_id,
    telegram_recipient_chat_id: linkResult.data.telegram_chat_id,
  });
  if (error) throw new Error(`No se pudo preparar el envío de Jarvis: ${error.message}`);
  return id;
}

function toHandoff(row: HandoffRow): JarvisStudyHandoff {
  const handoff = {
    schemaVersion: jarvisHandoffSchema,
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title),
    subject: String(row.subject),
    topic: String(row.topic),
    prompt: String(row.prompt),
    document: {
      path: `cloud://${String(row.document_storage_bucket)}/${String(row.document_storage_object_name)}`,
      fileName: String(row.document_file_name),
      mimeType: String(row.document_content_type),
      bytes: Number(row.document_size_bytes),
      sha256: String(row.document_sha256),
    },
    createdAt: String(row.created_at),
  };
  const parsed = parseJarvisStudyHandoff(handoff);
  if (!parsed) throw new Error("Cloud Jarvis handoff has an invalid document contract.");
  return parsed;
}

export async function getCloudJarvisSnapshot(supabase: SupabaseClient, ownerId: string): Promise<JarvisBridgeSnapshot> {
  const [handoffsResult, reportsResult] = await Promise.all([
    supabase.from("jarvis_study_handoffs")
      .select(`id,owner_id,title,subject,topic,prompt,status,created_at,${jarvisDocumentSnapshotSelect}`)
      .eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(12),
    supabase.from("jarvis_study_reports").select("owner_id,received_at,report")
      .eq("owner_id", ownerId).order("received_at", { ascending: false }).limit(12),
  ]);
  if (handoffsResult.error) throw new Error(`Cloud Jarvis handoff query failed: ${handoffsResult.error.message}`);
  if (reportsResult.error) throw new Error(`Cloud Jarvis report query failed: ${reportsResult.error.message}`);
  const reports = (reportsResult.data ?? []).map((row) => ({
    schemaVersion: jarvisReportEnvelopeSchema,
    ownerId: String(row.owner_id),
    receivedAt: String(row.received_at),
    report: row.report,
  } as JarvisStudyReportEnvelope));
  return {
    handoffs: (handoffsResult.data ?? []).map((row) => ({
      handoff: toHandoff(row as unknown as HandoffRow),
      status: (row.status === "reviewed" ? "reviewed" : row.status === "delivered" ? "delivered" : "queued") as JarvisBridgeStatus,
    })),
    reports,
  };
}

export function validateCloudReport(value: unknown) {
  const report = parseJarvisStudyReport(value);
  if (!report) throw new Error("Invalid Jarvis study report.");
  return report;
}

export { toHandoff };
