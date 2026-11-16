/**
 * Finds the cleanest (and dirtiest) stretches of a day, so outdoor time, airing the home
 * and commutes can be moved to them. Windows never cross midnight or skip a missing hour.
 */
import type { AirHour } from './schemas.js';
import { dayOf, hourOf } from './time.js';

/** A run of consecutive hours on one day; `endHour` is exclusive. */
export interface AirWindow {
  date: string;
  startHour: number;
  endHour: number;
  meanPm25: number;
}

/** Which hours of which day to search, and how many hours the window needs. */
export interface WindowQuery {
  date: string;
  length: number;
  fromHour: number;
  toHour: number;
}

/** All windows that fit the query, cleanest first (ties keep the earlier window). */
export function rankWindows(hours: readonly AirHour[], query: WindowQuery): AirWindow[] {
  const pm25ByHour = new Map<number, number>();
  for (const hour of hours) {
    const at = hourOf(hour.time);
    if (dayOf(hour.time) === query.date && at >= query.fromHour && at < query.toHour) {
      pm25ByHour.set(at, hour.pm25);
    }
  }
  const windows: AirWindow[] = [];
  for (let start = query.fromHour; start + query.length <= query.toHour; start += 1) {
    const mean = meanOver(pm25ByHour, start, query.length);
    if (mean !== null) {
      windows.push({
        date: query.date,
        startHour: start,
        endHour: start + query.length,
        meanPm25: mean,
      });
    }
  }
  return windows.sort((a, b) => a.meanPm25 - b.meanPm25);
}

/** The cleanest and dirtiest windows from a single ranking, or null when none fit. */
export function windowRange(
  hours: readonly AirHour[],
  query: WindowQuery,
): { best: AirWindow; worst: AirWindow } | null {
  const ranked = rankWindows(hours, query);
  const [best] = ranked;
  const worst = ranked.at(-1);
  return best && worst ? { best, worst } : null;
}

/** The cleanest window, or null when the day has no complete run of hours. */
export function cleanestWindow(hours: readonly AirHour[], query: WindowQuery): AirWindow | null {
  return rankWindows(hours, query)[0] ?? null;
}

/** The dirtiest window, or null when the day has no complete run of hours. */
export function worstWindow(hours: readonly AirHour[], query: WindowQuery): AirWindow | null {
  return rankWindows(hours, query).at(-1) ?? null;
}

function meanOver(
  pm25ByHour: ReadonlyMap<number, number>,
  start: number,
  length: number,
): number | null {
  let total = 0;
  for (let hour = start; hour < start + length; hour += 1) {
    const value = pm25ByHour.get(hour);
    if (value === undefined) return null;
    total += value;
  }
  return total / length;
}
