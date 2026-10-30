import { getAcademicOnboarding } from "@/lib/academic-collaboration/queries";
import { requireInstitutionalUser } from "@/lib/supabase/auth";
import { UniNovaSubjectsManager } from "@/components/uninova/uninova-subjects-manager";

export const metadata = {
  title: "Mis Asignaturas · UniNova UNAB",
  description: "Gestión y matrícula de asignaturas para estudiantes de Ingeniería UNAB.",
};

export default async function MateriasPage() {
  const { userId, email } = await requireInstitutionalUser();
  const data = await getAcademicOnboarding(userId);
  const currentTermKey = process.env.ACADEMIC_CURRENT_TERM_KEY ?? "2026-2";

  const userEmail = email ?? "user1@example.edu";
  const isDanielMonoga = userEmail.toLowerCase().includes("dmonoga");
  const userName = isDanielMonoga ? "Daniel Monoga" : (userEmail.split("@")[0] || "Estudiante");

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <UniNovaSubjectsManager
        subjects={data.subjects}
        professors={data.professors}
        sections={data.sections}
        membershipSectionIds={data.membershipSectionIds}
        currentTermKey={currentTermKey}
        userEmail={userEmail}
        userName={userName}
      />
    </main>
  );
}
