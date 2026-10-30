export function getBogotaWeekStart(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    const day = fallback.getDay();
    const diff = fallback.getDate() - day + (day === 0 ? -6 : 1);
    fallback.setDate(diff);
    fallback.setHours(0, 0, 0, 0);
    return fallback.toISOString();
  }
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function formatBogotaDateTime(dateInput: string | null | undefined): string {
  if (!dateInput) return "";
  return new Date(dateInput).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatBogotaDate(dateInput: string | null | undefined): string {
  if (!dateInput) return "";
  return new Date(dateInput).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
