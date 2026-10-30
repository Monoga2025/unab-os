import { notFound } from "next/navigation";
import { getSectionWorkspace } from "@/lib/academic-collaboration/queries";
import { requireInstitutionalUser } from "@/lib/supabase/auth";
import { AcademicSectionWorkspace } from "@/components/academic-section-workspace";

type Props = {
  params: Promise<{ sectionId: string }>;
};

export default async function SectionPage({ params }: Props) {
  await requireInstitutionalUser();
  const { sectionId } = await params;

  const data = await getSectionWorkspace(sectionId);
  if (!data) notFound();

  return (
    <main className="academic-page-container">
      <AcademicSectionWorkspace
        section={data.section}
        items={data.items}
        revisions={data.revisions}
      />
    </main>
  );
}
