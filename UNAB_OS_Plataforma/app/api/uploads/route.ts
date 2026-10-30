import { analyzeManuscript, manuscriptPolicy } from "@/lib/domain/feedback";
import { requireUser } from "@/lib/supabase/auth";
export async function POST(request: Request) {
  const body = await request.json() as { mimeType?: string; bytes?: number; pages?: number; readable?: boolean; attemptId?: string };
  if (!body.attemptId || typeof body.mimeType !== "string" || typeof body.bytes !== "number" || typeof body.pages !== "number") return Response.json({ error: "Attempt-bound manuscript metadata is required." }, { status: 400 });
  const { supabase } = await requireUser();
  const { data: attempt, error } = await supabase.from("attempts").select("id").eq("id", body.attemptId).maybeSingle();
  if (error || !attempt) return Response.json({ error: "Attempt not found." }, { status: 404 });
  return Response.json({ policy: manuscriptPolicy, analysis: analyzeManuscript({ mimeType: body.mimeType, bytes: body.bytes, pages: body.pages, readable: Boolean(body.readable) }) });
}
