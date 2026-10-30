import { TutorWorkspace } from "@/components/tutor-workspace";
import { LockedProFeature } from "@/components/locked-pro-feature";
import { requireUser } from "@/lib/supabase/auth";

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; new?: string }>;
}) {
  const { conversation: requestedConversationId, new: newConversation } = await searchParams;
  const { supabase, userId } = await requireUser();
  const [objectivesResult, documentsResult, sessionsResult, conversationsResult, attemptsResult] = await Promise.all([
    supabase.from("objectives").select("id, title").order("title"),
    supabase
      .from("study_documents")
      .select("id, file_name, mime_type")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("study_sessions")
      .select("id, title, started_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("tutor_conversations")
      .select("id, title, objective_id, study_document_id, study_session_id, status, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("attempts")
      .select("id, objective_id, created_at")
      .eq("user_id", userId)
      .eq("help_level", "none")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (objectivesResult.error || documentsResult.error || sessionsResult.error || conversationsResult.error || attemptsResult.error) {
    console.warn("Tutor queries warning:", {
      objectives: objectivesResult.error,
      documents: documentsResult.error,
      sessions: sessionsResult.error,
      conversations: conversationsResult.error,
      attempts: attemptsResult.error,
    });
  }

  const conversations = conversationsResult.data ?? [];
  const selectedConversation = newConversation === "1"
    ? null
    : conversations.find((conversation) => conversation.id === requestedConversationId)
      ?? conversations.find((conversation) => conversation.status === "active")
      ?? null;
  const messagesResult = selectedConversation
    ? await supabase
      .from("tutor_messages")
      .select("id, role, content, position, response_metadata, created_at")
      .eq("user_id", userId)
      .eq("conversation_id", selectedConversation.id)
      .order("position", { ascending: true })
      .limit(200)
    : { data: [], error: null };
  if (messagesResult.error) throw new Error("Unable to load tutor conversation messages.");

  return (
    <TutorWorkspace
      objectives={(objectivesResult.data ?? []).map((objective) => ({ id: objective.id, title: objective.title }))}
      documents={(documentsResult.data ?? []).map((document) => ({
        id: document.id,
        fileName: document.file_name,
        mimeType: document.mime_type,
      }))}
      sessions={(sessionsResult.data ?? []).map((session) => ({
        id: session.id,
        title: session.title,
        startedAt: session.started_at,
      }))}
      attempts={(attemptsResult.data ?? []).map((attempt) => ({
        id: attempt.id,
        objectiveId: attempt.objective_id,
        createdAt: attempt.created_at,
      }))}
      conversations={conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        objectiveId: conversation.objective_id,
        documentId: conversation.study_document_id,
        studySessionId: conversation.study_session_id,
        status: conversation.status,
        updatedAt: conversation.updated_at,
      }))}
      selectedConversationId={selectedConversation?.id ?? null}
      initialMessages={(messagesResult.data ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        position: message.position,
        responseMetadata: message.response_metadata,
        createdAt: message.created_at,
      }))}
    />
  );
}
