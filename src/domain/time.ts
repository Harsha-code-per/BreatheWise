/**
 * Wall-clock helpers. Open-Meteo returns local times such as "2026-11-16T14:00"
 * for the requested place, so plain string slicing is exact and needs no time-zone maths.
 */

/** Where the parts sit in "2026-11-16T14:00": the date ends at 10, the hour is 11–12. */
const DATE_END = 10;
const HOUR_START = 11;
const HOUR_END = 13;

/** Calendar date ("2026-11-16") of a local ISO time. */
export function dayOf(time: string): string {
  return time.slice(0, DATE_END);
}

/** Hour of day (0–23) of a local ISO time. */
export function hourOf(time: string): number {
  return Number(time.slice(HOUR_START, HOUR_END));
}

/** The local ISO time at the start of the hour: "2026-11-16T14:37" becomes "2026-11-16T14:00". */
export function startOfHour(time: string): string {
  return `${time.slice(0, HOUR_END)}:00`;
}

/** Formats an hour of day as "07:00"; 24 is shown as "24:00" so a window can end at midnight. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
