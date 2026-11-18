/**
 * Indoor air quality hacks, each scored with the mass-balance model in `indoor.ts`.
 */
import { NO_IMPACT, type Action, type PlanContext } from './action.js';
import { percentLess, weeklyCigarettes } from './exposure.js';
import {
  cadrFor,
  COOKING_HOURS,
  COOKING_RISE,
  DIY_BOX_CADR,
  HOME_AIR,
  indoorPm25,
} from './indoor.js';

/** Hours a typical family member spends at home on a smoggy winter day. */
const HOURS_INDOORS = 20;
/** Share of cooking smoke a kitchen exhaust or chimney removes (range hoods capture 30–90%). */
const EXHAUST_CAPTURE = 0.5;

/** Builds the indoor actions that apply to this home. */
export function indoorActions(ctx: PlanContext): Action[] {
  return [filtration(ctx), cooking(ctx), noSmoke(), wetClean(), plantsMyth()].filter(
    (action): action is Action => action !== null,
  );
}

function closedHome(ctx: PlanContext, cadr: number): number {
  return indoorPm25({
    outdoorPm25: ctx.meanPm25,
    areaM2: ctx.profile.home.areaM2,
    cadr,
    ach: HOME_AIR.closedAch,
  });
}

/** The effect of an indoor fix that lowers PM2.5 from `before` to `after` for some hours a day. */
function indoorImpact(before: number, after: number, hoursPerDay: number): Action['impact'] {
  return {
    ...NO_IMPACT,
    exposureCut: percentLess(before, after),
    cigarettesWeek: weeklyCigarettes(before - after, hoursPerDay),
  };
}

/** "from about 80 to 20 µg/m³", the change every indoor fix reports. */
function fromTo(before: number, after: number): string {
  return `from about ${String(Math.round(before))} to ${String(Math.round(after))} µg/m³`;
}

function filtration(ctx: PlanContext): Action {
  const { areaM2, purifierCadr } = ctx.profile.home;
  const owned = purifierCadr > 0;
  const needed = cadrFor(areaM2);
  const before = closedHome(ctx, 0);
  const after = closedHome(ctx, owned ? purifierCadr : DIY_BOX_CADR);
  const coverage = Math.min(100, Math.round((purifierCadr / needed) * 100));
  return {
    id: owned ? 'run-purifier' : 'diy-filter-box',
    kind: 'indoor',
    title: owned
      ? 'Run your purifier on high all day'
      : 'Build a box-fan filter (Corsi–Rosenthal box)',
    detail: owned
      ? `It covers ${String(coverage)}% of the ${String(needed)} m³/h this ${String(areaM2)} m² room needs. Indoor PM2.5 drops ${fromTo(before, after)}.`
      : `Tape four MERV-13 filters to a box fan. It cleans about ${String(DIY_BOX_CADR)} m³/h and takes indoor PM2.5 ${fromTo(before, after)}.`,
    when: null,
    impact: indoorImpact(before, after, HOURS_INDOORS),
  };
}

function cooking(ctx: PlanContext): Action | null {
  const { cooking: fuel, areaM2 } = ctx.profile.home;
  const rise = COOKING_RISE[fuel];
  const cleaner =
    fuel === 'kerosene' || fuel === 'biomass' ? COOKING_RISE.lpg : rise * (1 - EXHAUST_CAPTURE);
  const kitchen = (sourceRise: number) =>
    indoorPm25({ outdoorPm25: ctx.meanPm25, areaM2, cadr: 0, ach: HOME_AIR.closedAch, sourceRise });
  const before = kitchen(rise);
  const after = kitchen(cleaner);
  const switchFuel = cleaner === COOKING_RISE.lpg;
  return {
    id: switchFuel ? 'cleaner-cooking-fuel' : 'kitchen-exhaust',
    kind: 'indoor',
    title: switchFuel
      ? 'Switch to LPG or induction cooking'
      : 'Run the exhaust and use lids while cooking',
    detail: switchFuel
      ? `Solid fuels and kerosene fill the kitchen with smoke. Cleaner fuel cuts kitchen PM2.5 ${fromTo(before, after)} while you cook.`
      : 'An exhaust fan or chimney removes much of the smoke from frying before the family breathes it.',
    when: null,
    impact: indoorImpact(before, after, COOKING_HOURS),
  };
}

function noSmoke(): Action {
  return {
    id: 'no-incense',
    kind: 'indoor',
    title: 'Skip incense, mosquito coils and candles on smog days',
    detail:
      'One mosquito coil releases as much fine particulate as 75 to 137 cigarettes (Liu et al. 2003). Use a plug-in repellent or a net.',
    when: null,
    impact: NO_IMPACT,
  };
}

function wetClean(): Action {
  return {
    id: 'wet-clean',
    kind: 'indoor',
    title: 'Mop instead of sweeping',
    detail:
      'Sweeping throws settled dust back into the air. A damp mop or a vacuum with a HEPA filter keeps it down.',
    when: null,
    impact: NO_IMPACT,
  };
}

function plantsMyth(): Action {
  return {
    id: 'plants-myth',
    kind: 'indoor',
    title: 'Don’t rely on houseplants to clean the air',
    detail:
      'Matching even normal ventilation would take 10 to 1,000 plants per square metre (Cummings & Waring 2020). Spend on filtration instead.',
    when: null,
    impact: NO_IMPACT,
  };
}
