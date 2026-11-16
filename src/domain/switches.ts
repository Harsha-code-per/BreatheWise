/**
 * Sustainable alternatives: lower-carbon ways to commute and heat the home, with the CO₂
 * saved and the honest trade-off in breathing for active travel.
 */
import { NO_IMPACT, type Action, type PlanContext } from './action.js';
import { commuteCost, commuteOptions, type CommuteCost } from './commute.js';
import { percentLess } from './exposure.js';
import type { CommuteMode, HeatingType } from './schemas.js';

/** How many commute alternatives to offer. */
const MAX_COMMUTE_OPTIONS = 2;

/** Human labels for each way of commuting. */
const MODE_LABELS: Readonly<Record<CommuteMode, string>> = {
  car: 'driving alone',
  carpool: 'carpooling',
  motorbike: 'riding a motorbike',
  bus: 'the bus',
  metro: 'the metro',
  cycle: 'cycling',
  walk: 'walking',
};

const SOLID_HEAT: readonly HeatingType[] = ['wood', 'coal'];

/** Builds commute and heating swaps that would lower the family's footprint. */
export function switchActions(ctx: PlanContext): Action[] {
  const actions = commuteSwaps(ctx);
  if (SOLID_HEAT.includes(ctx.profile.home.heating))
    actions.push(heatingSwap(ctx.profile.home.heating));
  return actions;
}

function commuteSwaps(ctx: PlanContext): Action[] {
  const { commute } = ctx.profile;
  if (commute.daysPerWeek === 0 || commute.km === 0) return [];
  const current = commuteCost(commute, commute.mode, ctx.meanPm25);
  return commuteOptions(commute, ctx.meanPm25)
    .filter((option) => option.co2KgPerWeek < current.co2KgPerWeek)
    .slice(0, MAX_COMMUTE_OPTIONS)
    .map((option) => commuteSwap(current, option));
}

function commuteSwap(current: CommuteCost, option: CommuteCost): Action {
  const breathing = percentLess(current.dosePerWeek, option.dosePerWeek);
  const extraMinutes = option.minutesPerWeek - current.minutesPerWeek;
  const timeNote =
    extraMinutes > 0 ? `It adds about ${extraMinutes} minutes a week.` : 'It is no slower.';
  const breathNote =
    breathing < 0
      ? `You breathe in ${-breathing}% more PM2.5 on the way, so go at the cleanest hour and keep a mask handy.`
      : `You also breathe in ${breathing}% less PM2.5 on the way.`;
  return {
    id: `commute-${option.mode}`,
    kind: 'switch',
    title: `Switch from ${MODE_LABELS[current.mode]} to ${MODE_LABELS[option.mode]}`,
    detail: `${timeNote} ${breathNote}`,
    when: null,
    impact: {
      ...NO_IMPACT,
      exposureCut: breathing,
      co2KgWeek: Math.round((current.co2KgPerWeek - option.co2KgPerWeek) * 10) / 10,
    },
  };
}

function heatingSwap(heating: HeatingType): Action {
  return {
    id: 'heating-swap',
    kind: 'switch',
    title: `Replace the ${heating} heater with an electric one and draught-proofing`,
    detail:
      'Burning wood or coal at home is one of the largest winter smog sources, and it fills living rooms with smoke. Sealing gaps keeps the heat in.',
    when: null,
    impact: NO_IMPACT,
  };
}
