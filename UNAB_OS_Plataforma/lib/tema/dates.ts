const TEMA_TIME_ZONE = "America/Bogota" as const;
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

export type TemaDateValue = Readonly<{
  iso: string;
  timestamp: number;
}>;

export type TemaAvailability = Readonly<{
  opensAt: TemaDateValue | null;
  closesAt: TemaDateValue | null;
  timeZone: typeof TEMA_TIME_ZONE;
}>;

export type TemaActivityStatus = "graded" | "submitted" | "overdue" | "upcoming" | "unknown";
export type TemaDeadlineWindow = "tomorrow" | "this_week" | "later" | null;

export type TemaActivityClassification = Readonly<{
  status: TemaActivityStatus;
  deadlineWindow: TemaDeadlineWindow;
  closesAt: TemaDateValue | null;
}>;

function normalizeSpanish(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseClock(hourText: string, minuteText: string, periodText?: string): [number, number] | null {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const period = periodText?.toLowerCase().replace(/[.\s]/g, "");
  if (period) {
    if (hour < 1 || hour > 12 || (period !== "am" && period !== "pm")) return null;
    if (hour === 12) hour = 0;
    if (period === "pm") hour += 12;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  return [hour, minute];
}

function parseLabel(text: string, label: "Apertura" | "Cierre"): TemaDateValue | null {
  const expression = new RegExp(
    `${label}:\\s*(?:[\\p{L}]+,\\s*)?(\\d{1,2})\\s+de\\s+([\\p{L}]+)\\s+de\\s+(\\d{4}),\\s*(\\d{1,2}):(\\d{2})(?:\\s*(a\\.?\\s*m\\.?|p\\.?\\s*m\\.?|am|pm))?`,
    "iu",
  );
  const match = expression.exec(text);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTHS[normalizeSpanish(match[2])];
  const year = Number(match[3]);
  const clock = parseClock(match[4], match[5], match[6]);
  if (month === undefined || !clock || year < 2000 || year > 2100 || day < 1 || day > 31) return null;

  const [hour, minute] = clock;
  const timestamp = Date.UTC(year, month, day, hour + 5, minute);
  const bogotaWallClock = new Date(timestamp - BOGOTA_OFFSET_MS);
  if (
    bogotaWallClock.getUTCFullYear() !== year
    || bogotaWallClock.getUTCMonth() !== month
    || bogotaWallClock.getUTCDate() !== day
    || bogotaWallClock.getUTCHours() !== hour
    || bogotaWallClock.getUTCMinutes() !== minute
  ) return null;

  return { iso: new Date(timestamp).toISOString(), timestamp };
}

export function parseTemaAvailability(text: string): TemaAvailability {
  return {
    opensAt: parseLabel(text, "Apertura"),
    closesAt: parseLabel(text, "Cierre"),
    timeZone: TEMA_TIME_ZONE,
  };
}

function deadlineWindow(closesAt: TemaDateValue | null, nowTimestamp: number): TemaDeadlineWindow {
  if (!closesAt || closesAt.timestamp <= nowTimestamp) return null;

  const nowLocal = new Date(nowTimestamp - BOGOTA_OFFSET_MS);
  const closeLocal = new Date(closesAt.timestamp - BOGOTA_OFFSET_MS);
  const nowDay = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate());
  const closeDay = Date.UTC(closeLocal.getUTCFullYear(), closeLocal.getUTCMonth(), closeLocal.getUTCDate());
  const dayDifference = Math.round((closeDay - nowDay) / 86_400_000);
  if (dayDifference === 1) return "tomorrow";

  const weekday = nowLocal.getUTCDay() || 7;
  const endOfWeekDay = nowDay + (7 - weekday) * 86_400_000;
  return closeDay <= endOfWeekDay ? "this_week" : "later";
}

export function classifyTemaActivity(
  capturedText: readonly string[],
  nowTimestamp: number = Date.now(),
): TemaActivityClassification {
  const combined = capturedText.join(" ");
  const normalized = normalizeSpanish(combined).replace(/\s+/g, " ");
  const closesAt = capturedText
    .map((text) => parseTemaAvailability(text).closesAt)
    .find((date): date is TemaDateValue => date !== null) ?? null;

  let status: TemaActivityStatus = "unknown";
  if (/estado de la calificacion\s+calificado(?:\s|$)/.test(normalized)) {
    status = "graded";
  } else if (/enviado para calificar|la tarea fue enviada/.test(normalized)) {
    status = "submitted";
  } else if (/tarea esta retrasada|despues de la fecha limite/.test(normalized)) {
    status = "overdue";
  } else if (closesAt && closesAt.timestamp > nowTimestamp) {
    status = "upcoming";
  } else if (
    closesAt
    && closesAt.timestamp <= nowTimestamp
    && /todavia no se han realizado envios|no se ha enviado nada/.test(normalized)
  ) {
    status = "overdue";
  }

  return { status, deadlineWindow: deadlineWindow(closesAt, nowTimestamp), closesAt };
}
