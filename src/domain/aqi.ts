/**
 * US EPA Air Quality Index bands, which Open-Meteo reports as `us_aqi`.
 * Breakpoints and wording follow the EPA AQI technical assistance document (2024).
 */

export const AQI_LEVELS = [
  'good',
  'moderate',
  'sensitive',
  'unhealthy',
  'very-unhealthy',
  'hazardous',
] as const;

export type AqiLevel = (typeof AQI_LEVELS)[number];

/** One AQI band: its upper bound, label and plain-language guidance. */
export interface AqiBand {
  level: AqiLevel;
  max: number;
  label: string;
  guidance: string;
}

const HAZARDOUS: AqiBand = {
  level: 'hazardous',
  max: Number.POSITIVE_INFINITY,
  label: 'Hazardous',
  guidance: 'Stay indoors with filtered air. Wear a well-fitted N95 if you must go out.',
};

/** Bands with a finite upper bound; anything above the last one is hazardous. */
const BANDS: readonly AqiBand[] = [
  {
    level: 'good',
    max: 50,
    label: 'Good',
    guidance: 'Air is clean. A good time to air out the home.',
  },
  {
    level: 'moderate',
    max: 100,
    label: 'Moderate',
    guidance: 'Unusually sensitive people should take it easier outdoors.',
  },
  {
    level: 'sensitive',
    max: 150,
    label: 'Unhealthy for sensitive groups',
    guidance:
      'Children, older adults, pregnant people and anyone with asthma or heart disease should cut long or hard outdoor activity.',
  },
  {
    level: 'unhealthy',
    max: 200,
    label: 'Unhealthy',
    guidance:
      'Everyone should cut long or hard outdoor activity. Sensitive groups should stay indoors.',
  },
  {
    level: 'very-unhealthy',
    max: 300,
    label: 'Very unhealthy',
    guidance: 'Avoid outdoor exertion. Keep windows shut and run a purifier.',
  },
];

/** Returns the band an AQI value falls in. */
export function aqiBand(aqi: number): AqiBand {
  const rounded = Math.round(aqi);
  return BANDS.find((band) => rounded <= band.max) ?? HAZARDOUS;
}

/** Position of a level on the 0 (good) to 5 (hazardous) scale, for comparisons. */
export function levelRank(level: AqiLevel): number {
  return AQI_LEVELS.indexOf(level);
}
