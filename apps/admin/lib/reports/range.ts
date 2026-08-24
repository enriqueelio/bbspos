export const REPORT_TIMEZONE = "America/La_Paz";

export const MAX_RANGE_DAYS = 366;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function tzOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

export function getZonedParts(date: Date): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

export function zonedToUtc(p: Partial<ZonedParts> & Required<Pick<ZonedParts, "year" | "month" | "day">>): Date {
  const guess = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour ?? 0,
    p.minute ?? 0,
    p.second ?? 0,
  );
  let offset = tzOffsetMs(new Date(guess));
  let ts = guess - offset;
  offset = tzOffsetMs(new Date(ts));
  ts = guess - offset;
  return new Date(ts);
}

export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export function isValidLocalDate(value: string): value is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

function pad(n: number, size = 2): string {
  return String(n).padStart(size, "0");
}

export function localDateKey(value: LocalDate): string {
  return `${pad(value.year, 4)}-${pad(value.month)}-${pad(value.day)}`;
}

/** Instantes UTC que cubren el día calendario local [00:00, 24:00). */
export function dayBounds(date: LocalDate): { gte: Date; lt: Date } {
  const start = zonedToUtc({ ...date });
  const next = addLocalDays(date, 1);
  return { gte: start, lt: zonedToUtc({ ...next }) };
}

/** Instantes UTC que cubren el rango local [from 00:00, to+1 00:00). */
export function rangeBounds(
  from: LocalDate,
  to: LocalDate,
): { gte: Date; lt: Date } {
  const start = zonedToUtc({ ...from });
  const end = zonedToUtc({ ...addLocalDays(to, 1) });
  return { gte: start, lt: end };
}

export function diffLocalDays(from: LocalDate, to: LocalDate): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86_400_000);
}

export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day) + days * 86_400_000;
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Rango de igual duración inmediatamente anterior a [from, to]. */
export function previousPeriodRange(
  from: LocalDate,
  to: LocalDate,
): { from: LocalDate; to: LocalDate } {
  const days = diffLocalDays(from, to) + 1;
  return { from: addLocalDays(from, -days), to: addLocalDays(from, -1) };
}

/** Clave del día local: YYYY-MM-DD */
export function dayKeyOf(date: Date): string {
  const p = getZonedParts(date);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Clave de mes local: YYYY-MM */
export function monthKeyOf(date: Date): string {
  const p = getZonedParts(date);
  return `${pad(p.year, 4)}-${pad(p.month)}`;
}

/** Clave de semana ISO local: YYYY-Www */
export function isoWeekKeyOf(date: Date): string {
  const p = getZonedParts(date);
  const time = Date.UTC(p.year, p.month - 1, p.day);
  const dayNum = new Date(time).getUTCDay() || 7;
  const thursday = new Date(time + (4 - dayNum) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((thursday.getTime() - jan1) / 86_400_000 + 1) / 7);
  return `${pad(year, 4)}-W${pad(week)}`;
}

/** Hora local 0–23 */
export function hourOfDay(date: Date): number {
  return getZonedParts(date).hour;
}

/** Día de semana local con 0 = lunes … 6 = domingo */
export function weekdayIndex(date: Date): number {
  const p = getZonedParts(date);
  const jsDay = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return (jsDay + 6) % 7;
}
