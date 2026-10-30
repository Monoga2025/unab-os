import { compareAcademicAgendaEntries, type AcademicAgendaEntry } from "@/lib/domain/academic-collaboration";
import { getInstitutionalUser, requireInstitutionalUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Membership = { section_id: string };
type CatalogEntry = { id: string; display_name: string; normalized_key: string };
type Section = { id: string; subject_id: string; professor_id: string; term: string };
type AcademicItem = {
  id: string;
  section_id: string;
  item_type: AcademicAgendaEntry["itemType"];
  title: string;
  body: string;
  importance: AcademicAgendaEntry["importance"];
  starts_at: string | null;
  due_at: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};
type NamedSection = Section & {
  subjects?: { display_name?: string | null } | null;
  professors?: { display_name?: string | null } | null;
};

async function activeMembershipIds(userId: string, sectionId?: string): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase
    .from("section_memberships")
    .select("section_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (sectionId) query = query.eq("section_id", sectionId);

  const { data, error } = await query;
  if (error) return [];
  return ((data ?? []) as Membership[]).map((membership) => membership.section_id);
}

function toAgendaEntry(item: AcademicItem & Partial<NamedSection>): AcademicAgendaEntry {
  const section = item as AcademicItem & NamedSection;
  return {
    id: item.id,
    sectionId: item.section_id,
    subjectName: section.subjects?.display_name ?? "Materia",
    professorName: section.professors?.display_name ?? "Profesor/a",
    itemType: item.item_type,
    title: item.title,
    importance: item.importance,
    occursAt: item.due_at ?? item.starts_at ?? item.updated_at,
    href: item.item_type === "evaluation" ? `/evaluaciones/${item.id}` : `/section/${item.section_id}`,
  };
}

export async function getAcademicOnboarding(_callerUserId?: string) {
  const { userId } = await requireInstitutionalUser();
  const supabase = await createClient();
  const [subjectsResult, professorsResult, sectionsResult, membershipIds] = await Promise.all([
    supabase.from("subjects").select("id,display_name,normalized_key").is("retired_at", null).order("display_name"),
    supabase.from("professors").select("id,display_name,normalized_key").is("retired_at", null).order("display_name"),
    supabase.from("class_sections").select("id,subject_id,professor_id,term").is("retired_at", null).order("term"),
    activeMembershipIds(userId),
  ]);

  return {
    subjects: subjectsResult.error ? [] : ((subjectsResult.data ?? []) as CatalogEntry[]),
    professors: professorsResult.error ? [] : ((professorsResult.data ?? []) as CatalogEntry[]),
    sections: sectionsResult.error ? [] : ((sectionsResult.data ?? []) as Section[]),
    membershipSectionIds: membershipIds,
  };
}

export async function getSectionWorkspace(sectionId: string, _callerUserId?: string) {
  const { userId } = await requireInstitutionalUser();
  const memberships = await activeMembershipIds(userId, sectionId);
  if (!memberships.includes(sectionId)) return null;

  const supabase = await createClient();
  const [sectionResult, itemsResult, revisionsResult] = await Promise.all([
    supabase
      .from("class_sections")
      .select("id,subject_id,professor_id,term,subjects(display_name),professors(display_name)")
      .eq("id", sectionId)
      .is("retired_at", null)
      .maybeSingle(),
    supabase
      .from("academic_items")
      .select("id,section_id,item_type,title,body,importance,starts_at,due_at,version,created_by,updated_by,created_at,updated_at")
      .eq("section_id", sectionId)
      .eq("deleted_at", null)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("academic_item_revisions")
      .select("id,academic_item_id,section_id,version,action,changed_fields,actor_id,created_at")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: false }),
  ]);

  if (sectionResult.error || !sectionResult.data) return null;
  return {
    section: sectionResult.data as NamedSection,
    items: itemsResult.error ? [] : ((itemsResult.data ?? []) as AcademicItem[]),
    revisions: revisionsResult.error ? [] : revisionsResult.data ?? [],
  };
}

export async function getEvaluationWeek(weekStart: string, _callerUserId?: string) {
  const { userId } = await requireInstitutionalUser();
  const membershipIds = await activeMembershipIds(userId);
  if (membershipIds.length === 0) return [];

  const start = new Date(weekStart);
  if (Number.isNaN(start.getTime())) return [];
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_items")
    .select("id,section_id,item_type,title,body,importance,starts_at,due_at,version,created_by,updated_by,created_at,updated_at,class_sections!inner(id,term,subjects(display_name),professors(display_name))")
    .in("section_id", membershipIds)
    .eq("item_type", "evaluation")
    .eq("deleted_at", null)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString())
    .order("due_at");

  if (error) return [];
  return ((data ?? []) as unknown as Array<AcademicItem & { class_sections?: NamedSection | null }>).map((item) => {
    const section = item.class_sections;
    return toAgendaEntry({ ...item, subjects: section?.subjects, professors: section?.professors });
  });
}

export async function getEvaluationDetail(itemId: string, _callerUserId?: string) {
  const { userId } = await requireInstitutionalUser();
  const supabase = await createClient();
  const { data: identity, error: identityError } = await supabase
    .from("academic_items")
    .select("id,section_id")
    .eq("id", itemId)
    .eq("item_type", "evaluation")
    .eq("deleted_at", null)
    .maybeSingle();

  if (identityError || !identity) return null;
  const memberships = await activeMembershipIds(userId, identity.section_id);
  if (!memberships.includes(identity.section_id)) return null;

  const { data, error } = await supabase
    .from("academic_items")
    .select("id,section_id,item_type,title,body,importance,starts_at,due_at,version,created_by,updated_by,created_at,updated_at,class_sections!inner(id,term,subjects(display_name),professors(display_name))")
    .eq("id", itemId)
    .eq("item_type", "evaluation")
    .eq("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AcademicItem & { class_sections: NamedSection };
}

export async function getAcademicDashboard(_callerUserId?: string | Date, nowOrDate: Date | string = new Date()) {
  const isExplicitUserId = typeof _callerUserId === "string" && UUID_PATTERN.test(_callerUserId);
  let userId: string | undefined;

  if (isExplicitUserId) {
    userId = _callerUserId;
  } else {
    const authUser = await getInstitutionalUser();
    userId = authUser?.userId;
  }

  if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
    return { priority: null, agenda: [] as AcademicAgendaEntry[] };
  }

  const membershipIds = await activeMembershipIds(userId);
  const now = _callerUserId instanceof Date || (typeof _callerUserId === "string" && !UUID_PATTERN.test(_callerUserId) && !Number.isNaN(new Date(_callerUserId).getTime()))
    ? _callerUserId
    : nowOrDate;

  if (membershipIds.length === 0) return { priority: null, agenda: [] as AcademicAgendaEntry[] };


  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_items")
    .select("id,section_id,item_type,title,body,importance,starts_at,due_at,version,created_by,updated_by,created_at,updated_at,class_sections!inner(id,term,subjects(display_name),professors(display_name))")
    .in("section_id", membershipIds)
    .eq("deleted_at", null)
    .or(`due_at.gte.${new Date(now).toISOString()},starts_at.gte.${new Date(now).toISOString()}`)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(12);

  if (error) return { priority: null, agenda: [] as AcademicAgendaEntry[] };
  const agenda = ((data ?? []) as unknown as Array<AcademicItem & { class_sections?: NamedSection | null }>)
    .map((item) => {
      const section = item.class_sections;
      return toAgendaEntry({ ...item, subjects: section?.subjects, professors: section?.professors });
    })
    .sort((first, second) => compareAcademicAgendaEntries(first, second, now));

  return { priority: agenda[0] ?? null, agenda };
}