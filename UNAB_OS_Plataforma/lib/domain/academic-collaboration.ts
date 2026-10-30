export const ACADEMIC_ITEM_TYPES = ["note", "event", "reminder", "task", "evaluation"] as const;
export const ACADEMIC_IMPORTANCE = ["low", "normal", "high", "critical"] as const;

export type AcademicItemType = (typeof ACADEMIC_ITEM_TYPES)[number];
export type AcademicImportance = (typeof ACADEMIC_IMPORTANCE)[number];

export type AcademicItemInput = Readonly<{
  sectionId: string;
  itemType: AcademicItemType;
  title: string;
  body: string;
  importance: AcademicImportance;
  startsAt: string | null;
  dueAt: string | null;
  expectedVersion: number | null;
}>;

export type AcademicActionState = Readonly<{
  ok: boolean;
  message: string;
  fieldErrors?: Readonly<Record<string, string>>;
  conflict?: Readonly<{
    currentVersion: number;
    currentBody: string;
    attemptedBody: string;
  }>;
}>;

export type AcademicAgendaEntry = Readonly<{
  id: string;
  sectionId: string;
  subjectName: string;
  professorName: string;
  itemType: AcademicItemType;
  title: string;
  importance: AcademicImportance;
  occursAt: string;
  href: string;
}>;

const ACADEMIC_TYPE_ORDER: Readonly<Record<AcademicItemType, number>> = {
  evaluation: 0,
  task: 1,
  event: 2,
  reminder: 2,
  note: 3,
};

const ACADEMIC_IMPORTANCE_ORDER: Readonly<Record<AcademicImportance, number>> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const ACADEMIC_TIME_REQUIREMENTS: Readonly<
  Record<AcademicItemType, "startsAt" | "dueAt" | null>
> = {
  note: null,
  event: "startsAt",
  reminder: "dueAt",
  task: "dueAt",
  evaluation: "dueAt",
};

const IMMINENT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Return a canonical lower-case UNAB address, rejecting subdomains and other domains.
 */
export function normalizeInstitutionalEmail(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value.trim());
    const email = decoded.toLowerCase();
    return /^[^\s@]+@unab\.edu\.co$/.test(email) ? email : null;
  } catch {
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@unab\.edu\.co$/.test(email) ? email : null;
  }
}

/**
 * Return the key used for matching equivalent catalog labels.
 */
export function normalizeCatalogKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[\p{P}\p{S}_]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Validate only item-type invariants. Common field validation belongs at the form boundary.
 */
export function validateAcademicItem(input: AcademicItemInput): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};

  const requiredTime = ACADEMIC_TIME_REQUIREMENTS[input.itemType];
  if (requiredTime === "dueAt" && !input.dueAt) {
    errors.dueAt = "Ingresá una fecha de entrega o recordatorio.";
  } else if (requiredTime === "startsAt" && !input.startsAt) {
    errors.startsAt = "Ingresá una fecha de inicio.";
  }

  return errors;
}

/**
 * Sort agenda entries by urgency, academic type, importance, time, and title.
 * Entries due in the next 48 hours (including overdue entries) are urgent.
 */
export function compareAcademicAgendaEntries(
  first: AcademicAgendaEntry,
  second: AcademicAgendaEntry,
  now: Date | string,
): number {
  const referenceTime = new Date(now).getTime();
  const firstTime = new Date(first.occursAt).getTime();
  const secondTime = new Date(second.occursAt).getTime();
  const imminentCutoff = referenceTime + IMMINENT_WINDOW_MS;

  const firstUrgency = firstTime <= imminentCutoff ? 0 : 1;
  const secondUrgency = secondTime <= imminentCutoff ? 0 : 1;
  if (firstUrgency !== secondUrgency) return firstUrgency - secondUrgency;

  const typeOrder = ACADEMIC_TYPE_ORDER[first.itemType] - ACADEMIC_TYPE_ORDER[second.itemType];
  if (typeOrder !== 0) return typeOrder;

  const importanceOrder =
    ACADEMIC_IMPORTANCE_ORDER[first.importance] - ACADEMIC_IMPORTANCE_ORDER[second.importance];
  if (importanceOrder !== 0) return importanceOrder;

  const firstTimestamp = Number.isNaN(firstTime) ? Number.POSITIVE_INFINITY : firstTime;
  const secondTimestamp = Number.isNaN(secondTime) ? Number.POSITIVE_INFINITY : secondTime;
  if (firstTimestamp !== secondTimestamp) return firstTimestamp - secondTimestamp;

  return first.title < second.title ? -1 : first.title > second.title ? 1 : 0;
}
