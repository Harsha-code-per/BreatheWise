/**
 * Wall-clock helpers. Open-Meteo returns local times such as "2026-11-16T14:00"
 * for the requested place, so plain string slicing is exact and needs no time-zone maths.
 */

/** Calendar date ("2026-11-16") of a local ISO time. */
export function dayOf(time: string): string {
  return time.slice(0, 10);
}

/** Hour of day (0–23) of a local ISO time. */
export function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

/** Formats an hour of day as "07:00"; 24 is shown as "24:00" so a window can end at midnight. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
