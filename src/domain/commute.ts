/**
 * Commute alternatives: what each way of travelling costs in CO₂ and in PM2.5 breathed in.
 * Active travel cuts emissions to zero but raises breathing, so timing matters on smoggy days.
 */
import { inhaledDose, type Effort } from './exposure.js';
import type { CommuteMode, Profile } from './schemas.js';
import { MINUTES_PER_HOUR, round1 } from './units.js';

/** kg CO₂e per passenger-km, rounded from the UK DESNZ greenhouse-gas conversion factors (2024). */
export const CO2_PER_KM: Readonly<Record<CommuteMode, number>> = {
  car: 0.164,
  carpool: 0.082,
  motorbike: 0.113,
  bus: 0.102,
  metro: 0.028,
  cycle: 0,
  walk: 0,
};

/** Typical door-to-door urban speeds, km/h, including waiting and walking to stops. */
const SPEED_KMH: Readonly<Record<CommuteMode, number>> = {
  car: 22,
  carpool: 20,
  motorbike: 25,
  bus: 15,
  metro: 28,
  cycle: 14,
  walk: 5,
};

/** How hard each mode makes you breathe. */
const MODE_EFFORT: Readonly<Record<CommuteMode, Effort>> = {
  car: 'rest',
  carpool: 'rest',
  motorbike: 'rest',
  bus: 'rest',
  metro: 'rest',
  cycle: 'moderate',
  walk: 'light',
};

/** Longest one-way distance (km) at which a mode is offered as a realistic alternative. */
const MAX_KM: Partial<Readonly<Record<CommuteMode, number>>> = { walk: 3, cycle: 10 };

/** Weekly cost of commuting one way of travelling. */
export interface CommuteCost {
  mode: CommuteMode;
  minutesPerWeek: number;
  co2KgPerWeek: number;
  dosePerWeek: number;
}

/** Kilometres travelled a week: there and back on each commuting day. */
export function weeklyKm(commute: Profile['commute']): number {
  return commute.km * 2 * commute.daysPerWeek;
}

/** Weekly CO₂, time and inhaled dose for a mode, at a typical street PM2.5 level. */
export function commuteCost(
  commute: Profile['commute'],
  mode: CommuteMode,
  pm25: number,
): CommuteCost {
  const km = weeklyKm(commute);
  const hours = km / SPEED_KMH[mode];
  return {
    mode,
    minutesPerWeek: Math.round(hours * MINUTES_PER_HOUR),
    co2KgPerWeek: round1(km * CO2_PER_KM[mode]),
    dosePerWeek: inhaledDose(pm25, hours, MODE_EFFORT[mode]),
  };
}

/** Realistic modes for the trip distance, lowest CO₂ first, always including the current one. */
export function commuteOptions(commute: Profile['commute'], pm25: number): CommuteCost[] {
  const modes = (Object.keys(CO2_PER_KM) as CommuteMode[]).filter(
    (mode) => mode === commute.mode || commute.km <= (MAX_KM[mode] ?? Number.POSITIVE_INFINITY),
  );
  return modes
    .map((mode) => commuteCost(commute, mode, pm25))
    .sort((a, b) => a.co2KgPerWeek - b.co2KgPerWeek || a.dosePerWeek - b.dosePerWeek);
}
