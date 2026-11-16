/**
 * The setup form's working copy of a profile. It may be incomplete; `checkDraft` turns it into
 * a valid profile or into messages that say exactly what to fix.
 */
import { profileSchema, type Member, type Place, type Profile } from '../domain/schemas.js';

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

/** A new family member with a unique id. */
export function newMember(index: number, group: Member['group'] = 'adult'): Member {
  return {
    id: `member-${String(index)}`,
    name: index === 0 ? 'Me' : '',
    group,
    respiratory: false,
    outdoorWork: false,
  };
}

const FIELD_NAMES: Readonly<Record<string, string>> = {
  members: 'Family',
  commute: 'Commute',
  home: 'Home',
  exercise: 'Exercise',
  language: 'Language',
};

/** Validates a draft. Returns the profile, or one message per problem. */
export function checkDraft(draft: Draft): { profile: Profile } | { errors: string[] } {
  if (!draft.place) return { errors: ['Choose your city, or use your current location.'] };
  const parsed = profileSchema.safeParse(draft);
  if (parsed.success) return { profile: parsed.data };
  const errors = parsed.error.issues.map((issue) => {
    const [section] = issue.path;
    const name = FIELD_NAMES[String(section)] ?? 'A field';
    return issue.path.includes('name')
      ? `${name}: give every family member a name.`
      : `${name}: check the ${String(issue.path.at(-1))} value.`;
  });
  return { errors: [...new Set(errors)] };
}
