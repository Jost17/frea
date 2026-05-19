/**
 * ISO 8601 week utilities.
 * Week starts on Monday (ISO standard).
 */

/**
 * Returns the Monday of the ISO week containing isoDate.
 */
function getMonday(isoDate: string): Date {
  const d = new Date(isoDate);
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  // ISO: 1=Mon, 7=Sun; adjust so Monday=0 offset
  const dayOfWeek = d.getUTCDay(); // 0=Sun
  const diffToMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}

function toIsoDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the ISO week number for a given date.
 * ISO week 1 = week containing the first Thursday of the year.
 */
function getIsoWeekNumber(d: Date): { week: number; year: number } {
  // Thursday of current week determines the year
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = Math.round(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + ((yearStart.getUTCDay() + 6) % 7)) / 7,
  );
  return { week, year: thursday.getUTCFullYear() };
}

/**
 * Returns bounds and label for the ISO week containing isoDate.
 * Example: { weekStart: "2026-05-11", weekEnd: "2026-05-17", label: "KW 20 / 2026" }
 */
export function getIsoWeekBounds(isoDate: string): {
  weekStart: string;
  weekEnd: string;
  label: string;
} {
  const monday = getMonday(isoDate);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const weekStart = toIsoDateString(monday);
  const weekEnd = toIsoDateString(sunday);

  const { week, year } = getIsoWeekNumber(monday);
  const label = `KW ${week} / ${year}`;

  return { weekStart, weekEnd, label };
}

/**
 * Shifts a date by offset weeks and returns the resulting Monday as YYYY-MM-DD.
 * offset: -1 for previous week, +1 for next week.
 */
export function shiftWeek(isoDate: string, offset: number): string {
  const monday = getMonday(isoDate);
  monday.setUTCDate(monday.getUTCDate() + offset * 7);
  return toIsoDateString(monday);
}

/**
 * Returns today's date as YYYY-MM-DD using UTC.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns an array of 7 dates (Mon–Sun) for the ISO week of isoDate.
 */
export function getWeekDays(isoDate: string): string[] {
  const monday = getMonday(isoDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return toIsoDateString(d);
  });
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Returns short weekday label + day.month for display, e.g. "Mo 13.05."
 */
export function formatWeekDayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0=Mon
  const label = WEEKDAY_LABELS[dayOfWeek];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${label} ${day}.${month}.`;
}
