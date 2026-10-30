import { EntrenadorWorkspace } from "@/components/entrenador-workspace";
import { requireUser } from "@/lib/supabase/auth";

export default async function EntrenadorPage() {
  await requireUser();
  return <EntrenadorWorkspace />;
}
