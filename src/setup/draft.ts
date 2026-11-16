/**
 * The setup form's working copy of a profile. It may be incomplete; `checkDraft` turns it into
 * a valid profile or into messages that say exactly what to fix, and `applyIntake` merges what
 * Gemini read from the family's own description.
 */
import {
  profileSchema,
  type Intake,
  type Member,
  type Place,
  type Profile,
} from '../domain/schemas.js';

/** A profile still being filled in: the place may be missing. */
export type Draft = Omit<Profile, 'place'> & { place: Place | null };

/** Sensible starting values for a new family. */
export function newDraft(): Draft {
  return {
    place: null,
    members: [newMember(0, 'adult')],
    commute: { mode: 'car', km: 8, daysPerWeek: 5, departHour: 8, returnHour: 18 },
    home: { areaM2: 20, purifierCadr: 0, cooking: 'lpg', heating: 'none' },
    exercise: { minutes: 30, outdoors: true },
    language: 'en',
  };
}

/** A new family member with a unique id and no name yet. */
export function newMember(index: number, group: Member['group'] = 'adult'): Member {
  return { id: `member-${String(index)}`, name: '', group, respiratory: false, outdoorWork: false };
}

/** A friendly default for members left unnamed. */
function fallbackName(index: number): string {
  return index === 0 ? 'You' : `Person ${String(index + 1)}`;
}

const FIELD_NAMES: Readonly<Record<string, string>> = {
  members: 'Family',
  commute: 'Commute',
  home: 'Home',
  exercise: 'Exercise',
  language: 'Language',
};

/** The visible label of each field, as people see it in the form. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  km: 'one-way distance',
  daysPerWeek: 'days a week',
  areaM2: 'room size',
  purifierCadr: 'purifier CADR',
  minutes: 'minutes a day',
  members: 'family list',
};

/** Validates a draft. Returns the profile, or one message per problem. */
export function checkDraft(draft: Draft): { profile: Profile } | { errors: string[] } {
  if (!draft.place) return { errors: ['Choose your city, or use your current location.'] };
  const members = draft.members.map((member, index) => ({
    ...member,
    name: member.name.trim() === '' ? fallbackName(index) : member.name.trim(),
  }));
  const parsed = profileSchema.safeParse({ ...draft, members });
  if (parsed.success) return { profile: parsed.data };
  const errors = parsed.error.issues.map((issue) => {
    const section = FIELD_NAMES[String(issue.path[0])] ?? 'Your answers';
    const field = String(issue.path.at(-1));
    return `${section}: check the ${FIELD_LABELS[field] ?? field} value.`;
  });
  return { errors: [...new Set(errors)] };
}

/** Keeps only the fields that have a value, so they can be spread over existing ones. */
function present<T extends object>(fields: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

/** Merges fields read from a description into the draft, leaving everything else as it was. */
export function applyIntake(draft: Draft, intake: Intake): Draft {
  const members = (intake.members ?? []).map((member, index) => ({
    ...member,
    id: `member-${String(index)}`,
  }));
  return {
    ...draft,
    members: members.length > 0 ? members : draft.members,
    commute: {
      ...draft.commute,
      ...present({
        mode: intake.commuteMode,
        km: intake.commuteKm,
        daysPerWeek: intake.commuteDays,
        departHour: intake.departHour,
      }),
    },
    home: {
      ...draft.home,
      ...present({
        areaM2: intake.roomAreaM2,
        purifierCadr: intake.purifierCadr,
        cooking: intake.cooking,
        heating: intake.heating,
      }),
    },
    exercise: {
      ...draft.exercise,
      ...present({ minutes: intake.exerciseMinutes, outdoors: intake.exercisesOutdoors }),
    },
  };
}
