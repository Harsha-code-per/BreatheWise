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

/** Bounds for the numbers a family enters; the schemas and the form inputs both read these. */
export const RANGES = {
  commuteKm: { min: 0, max: 200 },
  commuteDays: { min: 0, max: 7 },
  roomAreaM2: { min: 5, max: 500 },
  purifierCadr: { min: 0, max: 3000 },
  exerciseMinutes: { min: 0, max: 240 },
} as const;

/** Most households fit; the form stops adding people here. */
export const MAX_MEMBERS = 12;

const inRange = ({ min, max }: { min: number; max: number }) => z.number().min(min).max(max);

const hourSchema = z.number().int().min(0).max(23);
const commuteKmSchema = inRange(RANGES.commuteKm);
const commuteDaysSchema = inRange(RANGES.commuteDays).int();
const roomAreaSchema = inRange(RANGES.roomAreaM2);
const purifierCadrSchema = inRange(RANGES.purifierCadr);
const exerciseMinutesSchema = inRange(RANGES.exerciseMinutes).int();

export const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const memberSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,24}$/),
  name: z.string().trim().min(1).max(40),
  group: z.enum(MEMBER_GROUPS),
  respiratory: z.boolean(),
  outdoorWork: z.boolean(),
});

export const profileSchema = z.object({
  place: placeSchema,
  members: z.array(memberSchema).min(1).max(MAX_MEMBERS),
  commute: z.object({
    mode: z.enum(COMMUTE_MODES),
    km: commuteKmSchema,
    daysPerWeek: commuteDaysSchema,
    departHour: hourSchema,
    returnHour: hourSchema,
  }),
  home: z.object({
    areaM2: roomAreaSchema,
    purifierCadr: purifierCadrSchema,
    cooking: z.enum(COOKING_FUELS),
    heating: z.enum(HEATING_TYPES),
  }),
  exercise: z.object({ minutes: exerciseMinutesSchema, outdoors: z.boolean() }),
  language: z.enum(LANGUAGES),
});

const airHourSchema = z.object({
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
export const locateRequestSchema = z.object({
  coords: placeSchema.pick({ lat: true, lon: true }).nullable(),
});

/** What Gemini may extract from a free-text description of the household; every field is optional. */
export const intakeSchema = z
  .object({
    city: z.string().trim().min(1).max(80),
    // The AI may leave a name blank; the form fills it in from the relationship.
    members: z
      .array(
        z.object({
          name: z.string().trim().max(40),
          ...memberSchema.pick({ group: true, respiratory: true, outdoorWork: true }).shape,
        }),
      )
      .max(MAX_MEMBERS),
    commuteMode: z.enum(COMMUTE_MODES),
    commuteKm: commuteKmSchema,
    commuteDays: commuteDaysSchema,
    departHour: hourSchema,
    cooking: z.enum(COOKING_FUELS),
    heating: z.enum(HEATING_TYPES),
    roomAreaM2: roomAreaSchema,
    purifierCadr: purifierCadrSchema,
    exerciseMinutes: exerciseMinutesSchema,
    exercisesOutdoors: z.boolean(),
  })
  .partial();

/** Ids of the actions a family chose to do. */
export const choicesSchema = z.array(z.string().max(40)).max(40);

export const intakeRequestSchema = z.object({ text: z.string().trim().min(3).max(600) });
export const intakeResponseSchema = z.object({ intake: intakeSchema });

export type Briefing = z.infer<typeof briefingSchema>;
export type Intake = z.infer<typeof intakeSchema>;
export type PlanResponse = z.infer<typeof planResponseSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
