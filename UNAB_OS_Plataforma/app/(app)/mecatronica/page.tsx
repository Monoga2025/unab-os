import { MecatronicaWorkspace } from "@/components/mecatronica-workspace";
import { requireInstitutionalUser } from "@/lib/supabase/auth";

export default async function MecatronicaPage() {
  await requireInstitutionalUser();

  return (
    <main className="academic-page-container">
      <MecatronicaWorkspace />
    </main>
  );
}
