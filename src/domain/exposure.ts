/**
 * Exposure arithmetic. What reaches the lungs scales with concentration × time ×
 * breathing rate, so moving an activity to a cleaner hour or a calmer effort cuts the dose.
 */

/**
 * Breathing rate relative to rest. The EPA Exposure Factors Handbook (2011, ch. 6)
 * puts light activity at roughly twice and moderate activity at roughly four times resting.
 */
export const BREATHING = { rest: 1, light: 2, moderate: 4 } as const;

export type Effort = keyof typeof BREATHING;

/**
 * Breathing 22 µg/m³ of PM2.5 for a day is comparable to smoking one cigarette
 * (Berkeley Earth, Muller & Muller 2015), so one cigarette ≈ 22 × 24 µg·h/m³.
 */
export const CIGARETTE_UG_HOURS = 22 * 24;

/** Relative inhaled PM2.5 dose for a stretch of time at a given effort. */
export function inhaledDose(pm25: number, hours: number, effort: Effort): number {
  return pm25 * hours * BREATHING[effort];
}

/** Cigarettes-equivalent of breathing a PM2.5 concentration for some hours. */
export function cigarettes(pm25: number, hours: number): number {
  return (pm25 * hours) / CIGARETTE_UG_HOURS;
}

/** Whole-number percentage by which `after` is lower than `before` (negative if higher). */
export function percentLess(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 100);
}

/** Rounds to one decimal place for display without losing small numbers entirely. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
