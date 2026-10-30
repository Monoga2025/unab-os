import { getEvaluationWeek } from "@/lib/academic-collaboration/queries";
import { getBogotaWeekStart } from "@/lib/academic-collaboration/dates";
import { requireInstitutionalUser } from "@/lib/supabase/auth";
import { AcademicEvaluationCalendar } from "@/components/academic-evaluation-calendar";

type Props = {
  searchParams: Promise<{ week?: string }>;
};

export default async function EvaluacionesPage({ searchParams }: Props) {
  await requireInstitutionalUser();
  const { week } = await searchParams;
  const weekStart = getBogotaWeekStart(week);

  const evaluations = await getEvaluationWeek(weekStart);

  return (
    <main className="academic-page-container">
      <AcademicEvaluationCalendar evaluations={evaluations} weekStart={weekStart} />
    </main>
  );
}
