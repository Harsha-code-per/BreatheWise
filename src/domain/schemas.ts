/**
 * Shared data contracts. The browser and the API validate with the same schemas,
 * and the TypeScript types are derived from them, so the three never drift apart.
 */
import { z } from 'zod';

export const MEMBER_GROUPS = ['adult', 'child', 'older', 'pregnant'] as const;
export const COMMUTE_MODES = [
  'car',
  'carpool',
  'motorbike',
  'bus',
  'metro',
  'cycle',
  'walk',
] as const;
export const COOKING_FUELS = ['electric', 'lpg', 'kerosene', 'biomass'] as const;
export const HEATING_TYPES = ['none', 'electric', 'gas', 'wood', 'coal'] as const;
export const LANGUAGES = ['en', 'hi', 'bn', 'mr', 'ta'] as const;

const hourSchema = z.number().int().min(0).max(23);

export const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const memberSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,24}$/),
  name: z.string().trim().min(1).max(40),
  group: z.enum(MEMBER_GROUPS),
  respiratory: z.boolean(),
  outdoorWork: z.boolean(),
});

export const profileSchema = z.object({
  place: placeSchema,
  members: z.array(memberSchema).min(1).max(12),
  commute: z.object({
    mode: z.enum(COMMUTE_MODES),
    km: z.number().min(0).max(200),
    daysPerWeek: z.number().int().min(0).max(7),
    departHour: hourSchema,
    returnHour: hourSchema,
  }),
  home: z.object({
    areaM2: z.number().min(5).max(500),
    purifierCadr: z.number().min(0).max(3000),
    cooking: z.enum(COOKING_FUELS),
    heating: z.enum(HEATING_TYPES),
  }),
  exercise: z.object({ minutes: z.number().int().min(0).max(240), outdoors: z.boolean() }),
  language: z.enum(LANGUAGES),
});

export const airHourSchema = z.object({
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  aqi: z.number().min(0),
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  no2: z.number().min(0).nullable(),
  o3: z.number().min(0).nullable(),
  blh: z.number().min(0).nullable(),
});

export const airSnapshotSchema = z.object({
  place: placeSchema,
  timezone: z.string().max(64),
  now: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  hours: z
    .array(airHourSchema)
    .min(1)
    .max(24 * 7),
});

export type Place = z.infer<typeof placeSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];
export type HeatingType = (typeof HEATING_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];
export type AirHour = z.infer<typeof airHourSchema>;
export type AirSnapshot = z.infer<typeof airSnapshotSchema>;

/** What the AI (or the engine's fallback) writes: wording only, keyed to engine action ids. */
export const briefingSchema = z.object({
  headline: z.string().trim().min(1).max(140),
  summary: z.string().trim().min(1).max(700),
  explanations: z
    .array(z.object({ id: z.string().max(40), why: z.string().trim().min(1).max(320) }))
    .max(16),
});

export const planRequestSchema = z.object({ profile: profileSchema });

export const planResponseSchema = z.object({
  briefing: briefingSchema,
  source: z.enum(['ai', 'engine']),
});

export const askRequestSchema = z.object({
  profile: profileSchema,
  question: z.string().trim().min(2).max(400),
});

export const askResponseSchema = z.object({
  answer: z.string().max(2000),
  source: z.enum(['ai', 'engine']),
});

export const placeQuerySchema = z.object({ query: z.string().trim().min(2).max(80) });
export const placeListSchema = z.object({ places: z.array(placeSchema).max(8) });
export const airRequestSchema = z.object({ place: placeSchema });

export type Briefing = z.infer<typeof briefingSchema>;
export type PlanResponse = z.infer<typeof planResponseSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
