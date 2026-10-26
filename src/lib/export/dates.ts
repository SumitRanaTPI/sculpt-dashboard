/**
 * Archive dates are calendar days in Asia/Kolkata (UTC+05:30, no daylight saving).
 * A garment belongs to the day its `created_at` falls on in that zone.
 * The range is inclusive of both the from day and the to day.
 */

export const EXPORT_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

export type DatePreset = "today" | "yesterday" | "custom";

export interface DateRange {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function calendarDate(instant: Date, timeZone = EXPORT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Shift a calendar date by whole days. `ymd` is not a timezone instant. */
export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, (month ?? 1) - 1, (day ?? 1) + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function rangeForPreset(preset: "today" | "yesterday", now = new Date()): DateRange {
  const today = calendarDate(now);
  if (preset === "today") return { from: today, to: today };
  const yesterday = addCalendarDays(today, -1);
  return { from: yesterday, to: yesterday };
}

export function isValidYmd(value: string): boolean {
  if (!YMD.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year!, (month ?? 1) - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === (month ?? 1) - 1 &&
    probe.getUTCDate() === day
  );
}

export function isValidRange(range: { from: string; to: string } | null): range is DateRange {
  if (!range || !isValidYmd(range.from) || !isValidYmd(range.to)) return false;
  return range.from <= range.to;
}

/** Inclusive start of `ymd` in Asia/Kolkata, as epoch ms. */
export function dayStartMs(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00${IST_OFFSET}`);
}

export function createdInRange(createdAt: string, range: DateRange): boolean {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  const start = dayStartMs(range.from);
  const end = dayStartMs(addCalendarDays(range.to, 1));
  return t >= start && t < end;
}

export function archiveFilename(range: DateRange, ext: "pdf" | "md"): string {
  return `sculpt-archive-${range.from}_to_${range.to}.${ext}`;
}

export function garmentFilename(humanId: string, ext: "pdf" | "md"): string {
  const safe = humanId.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "garment";
  return `sculpt-${safe}.${ext}`;
}
