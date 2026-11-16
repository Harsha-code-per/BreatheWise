/**
 * Winter smog detection. On calm, cold nights the boundary layer collapses and traps
 * pollution near the ground (a temperature inversion); combined with high PM2.5 that is smog.
 */
import { aqiBand, type AqiLevel } from './aqi.js';
import type { AirHour } from './schemas.js';
import { dayOf, hourOf } from './time.js';

/** Mixing layers shallower than this (metres) are treated as an inversion that traps smoke. */
const INVERSION_BLH_M = 300;

/** PM2.5 (µg/m³) at which the EPA scale reaches "Unhealthy" for everyone. */
export const SMOG_PM25 = 55.5;

/** One day of the forecast summarised for the outlook strip. */
export interface DayOutlook {
  date: string;
  peakAqi: number;
  meanPm25: number;
  trappedHours: number;
  smogHours: number;
  level: AqiLevel;
}

/** True when the boundary layer is shallow enough to trap pollution at street level. */
export function isTrapped(hour: AirHour): boolean {
  return hour.blh !== null && hour.blh < INVERSION_BLH_M;
}

/** True when PM2.5 is at "Unhealthy" levels and an inversion is holding it down. */
export function isSmog(hour: AirHour): boolean {
  return hour.pm25 >= SMOG_PM25 && isTrapped(hour);
}

/** A run of consecutive trapped hours on one day; `endHour` is exclusive. */
export interface TrappedRun {
  startHour: number;
  endHour: number;
}

/** Consecutive runs of trapped hours in one day's data, starting at or after `fromHour`. */
export function trappedRuns(dayHours: readonly AirHour[], fromHour: number): TrappedRun[] {
  const runs: TrappedRun[] = [];
  for (const hour of dayHours) {
    const at = hourOf(hour.time);
    if (at < fromHour || !isTrapped(hour)) continue;
    const last = runs.at(-1);
    if (last?.endHour === at) last.endHour = at + 1;
    else runs.push({ startHour: at, endHour: at + 1 });
  }
  return runs;
}

/** Groups hourly data into per-day summaries, in forecast order. */
export function dailyOutlook(hours: readonly AirHour[]): DayOutlook[] {
  const days = new Map<string, AirHour[]>();
  for (const hour of hours) {
    const date = dayOf(hour.time);
    days.set(date, [...(days.get(date) ?? []), hour]);
  }
  return [...days].map(([date, dayHours]) => summariseDay(date, dayHours));
}

function summariseDay(date: string, hours: readonly AirHour[]): DayOutlook {
  const peakAqi = Math.round(Math.max(...hours.map((hour) => hour.aqi)));
  const meanPm25 = Math.round(hours.reduce((sum, hour) => sum + hour.pm25, 0) / hours.length);
  return {
    date,
    peakAqi,
    meanPm25,
    trappedHours: hours.filter(isTrapped).length,
    smogHours: hours.filter(isSmog).length,
    level: aqiBand(peakAqi).level,
  };
}
