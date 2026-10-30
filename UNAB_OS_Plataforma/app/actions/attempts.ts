"use server";
import { revalidatePath } from "next/cache";
import { parseAttemptSubmission } from "@/lib/attempt-submission";
import { requireUser } from "@/lib/supabase/auth";

export async function submitAttempt(formData: FormData) {
  const submission = parseAttemptSubmission(formData);
  if (!submission) throw new Error("Invalid attempt submission.");

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("submit_attempt", {
    p_objective_id: submission.objectiveId,
    p_exercise_version_id: submission.exerciseVersionId,
    p_idempotency_key: submission.idempotencyKey,
    p_correct: submission.correct,
    p_help_level: submission.helpLevel,
  });
  if (error) throw new Error("Unable to record the attempt.");

  revalidatePath("/dashboard");
  revalidatePath(`/objective/${submission.objectiveId}`);
}
