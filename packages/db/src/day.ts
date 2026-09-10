export const TIME_ZONE = "America/La_Paz";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clave local (YYYY-MM-DD) de un instante en la zona del restaurante. */
export function localDayKey(date: Date): string {
  return dayFormatter.format(date);
}

/** Hoy como clave local YYYY-MM-DD. */
export function todayKey(): string {
  return localDayKey(new Date());
}

function parseKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/**
 * Convierte una medianoche local (clave YYYY-MM-DD) al instante UTC equivalente
 * en la zona del restaurante.
 */
function zonedStartOfDay(key: string): Date {
  const { year, month, day } = parseKey(key);
  const guessUtcMs = Date.UTC(year, month - 1, day, 4, 0, 0);
  const hourInZone = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date(guessUtcMs)),
  );
  // La zona no cambia de horario de verano; el offset es fijo (-4 h).
  const corrected =
    hourInZone === 0 ? guessUtcMs : guessUtcMs - (hourInZone + 4) * 3_600_000;
  return new Date(corrected);
}

/** Límites [inicio, fin) en UTC del día local indicado. */
export function dayBounds(key: string): { gte: Date; lt: Date } {
  const start = zonedStartOfDay(key);
  const end = new Date(start.getTime() + 24 * 3_600_000);
  return { gte: start, lt: end };
}