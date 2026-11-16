/**
 * The shape of every recommendation. Numbers are computed by the engine; the AI may only
 * rewrite the wording (`why`), never the impact.
 */
import type { AqiBand } from './aqi.js';
import type { AirHour, AirSnapshot, Member, Profile } from './schemas.js';

export type ActionKind = 'routine' | 'indoor' | 'switch' | 'community';

/** Measured effect of one action. Null means the effect is real but not quantified. */
export interface Impact {
  exposureCut: number | null;
  co2KgWeek: number | null;
  cigarettesWeek: number | null;
}

/** One recommendation the family can act on. */
export interface Action {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string;
  when: string | null;
  impact: Impact;
}

/** Everything the action builders need, worked out once per analysis. */
export interface PlanContext {
  profile: Profile;
  air: AirSnapshot;
  current: AirHour;
  band: AqiBand;
  planDate: string;
  fromHour: number;
  dayHours: readonly AirHour[];
  meanPm25: number;
  sensitive: readonly Member[];
}

/** An impact with nothing quantified; spread it and set the fields that apply. */
export const NO_IMPACT: Impact = { exposureCut: null, co2KgWeek: null, cigarettesWeek: null };

/** True for members who need extra care on polluted days (EPA "sensitive groups"). */
export function isSensitive(member: Member): boolean {
  return member.group !== 'adult' || member.respiratory || member.outdoorWork;
}

/** Joins names as "Asha, Ravi and Mum". */
export function listNames(members: readonly Member[]): string {
  const names = members.map((member) => member.name);
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.slice(-1).join('')}`;
}
