/**
 * Indoor PM2.5 from a single-room steady-state mass balance:
 *   C_in = (P·a·C_out + S/V) / (a + k + CADR/V)
 * where P is penetration, a the air-exchange rate (per hour), k deposition, and CADR the
 * clean-air delivery rate of a purifier. See the EPA "Guide to Air Cleaners in the Home" (2018).
 */
import type { CookingFuel } from './schemas.js';

/** Purifier ratings are quoted to the nearest 10 m³/h. */
const CADR_STEP = 10;
/** One cubic foot per minute is 1.699 m³ per hour. */
const M3H_PER_CFM = 1.699;

/** Typical ceiling height used to turn floor area into room volume, metres. */
const ROOM_HEIGHT_M = 2.7;

/** Mass-balance constants for a home with windows shut in winter. */
export const HOME_AIR = {
  penetration: 0.8,
  deposition: 0.2,
  closedAch: 0.5,
  openAch: 4,
} as const;

/** Purifiers are sized for about five clean-air changes an hour in the room they serve. */
const TARGET_CLEAN_ACH = 5;

/**
 * A DIY Corsi–Rosenthal box (box fan + four MERV-13 filters) delivers roughly 600 cfm,
 * about 1000 m³/h (Dal Porto et al. 2022, Aerosol Science and Technology).
 */
export const DIY_BOX_CADR = 1000;

/**
 * Rise in kitchen PM2.5 while cooking, µg/m³, before ventilation. Illustrative values within
 * the ranges reported in the WHO guidelines on household fuel combustion (2014).
 */
export const COOKING_RISE: Readonly<Record<CookingFuel, number>> = {
  electric: 10,
  lpg: 25,
  kerosene: 100,
  biomass: 300,
};

/** Hours of cooking in a typical day. */
export const COOKING_HOURS = 2;

/** Inputs to the mass balance. `sourceRise` is the indoor rise a source causes without filtration. */
export interface IndoorInput {
  outdoorPm25: number;
  areaM2: number;
  cadr: number;
  ach: number;
  sourceRise?: number;
}

/** Steady-state indoor PM2.5 (µg/m³) for the given home, air exchange and purifier. */
export function indoorPm25(input: IndoorInput): number {
  const volume = input.areaM2 * ROOM_HEIGHT_M;
  const losses = input.ach + HOME_AIR.deposition;
  const source = (input.sourceRise ?? 0) * losses;
  const infiltrated = HOME_AIR.penetration * input.ach * input.outdoorPm25;
  return (infiltrated + source) / (losses + input.cadr / volume);
}

/** Clean-air delivery rate (m³/h) a purifier needs for the room, rounded to 10. */
export function cadrFor(areaM2: number): number {
  const needed = areaM2 * ROOM_HEIGHT_M * TARGET_CLEAN_ACH;
  return Math.round(needed / CADR_STEP) * CADR_STEP;
}

/** Converts a purifier rating in cubic feet per minute to m³/h. */
export function cfmToM3h(cfm: number): number {
  return Math.round(cfm * M3H_PER_CFM);
}
