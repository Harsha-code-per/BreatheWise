/**
 * The engine's single entry point: turns a family profile and the local forecast into a
 * complete, explainable plan. Pure and deterministic, so it runs identically in the
 * browser, on the server and in tests.
 */
import type { Action } from './action.js';
import type { AqiBand } from './aqi.js';
import { communityActions } from './community.js';
import { buildContext } from './context.js';
import { indoorActions } from './home.js';
import { routineActions } from './routine.js';
import type { AirHour, AirSnapshot, Profile } from './schemas.js';
import { dailyOutlook, isSmog, type DayOutlook } from './smog.js';
import { switchActions } from './switches.js';

/**
 * Weekly totals. Smoke avoided adds up across routine and indoor actions, which happen at
 * different times; CO₂ is the single best switch, because commute options are alternatives.
 */
export interface Totals {
  bestCo2KgWeek: number;
  cigarettesWeek: number;
  topExposureCut: number;
}

/** The full result shown on the dashboard and handed to the AI as grounding facts. */
export interface Analysis {
  placeName: string;
  current: AirHour;
  band: AqiBand;
  smogNow: boolean;
  planDate: string;
  outlook: DayOutlook[];
  sensitiveNames: string[];
  routine: Action[];
  indoor: Action[];
  switches: Action[];
  community: Action[];
  totals: Totals;
}

/** Analyses a profile against an air snapshot. */
export function analyse(profile: Profile, air: AirSnapshot): Analysis {
  const ctx = buildContext(profile, air);
  const routine = routineActions(ctx);
  const indoor = indoorActions(ctx);
  const switches = switchActions(ctx);
  const community = communityActions(ctx);
  return {
    placeName: air.place.name,
    current: ctx.current,
    band: ctx.band,
    smogNow: isSmog(ctx.current),
    planDate: ctx.planDate,
    outlook: dailyOutlook(air.hours),
    sensitiveNames: ctx.sensitive.map((member) => member.name),
    routine,
    indoor,
    switches,
    community,
    totals: totalsOf([...routine, ...indoor], [...switches, ...community]),
  };
}

/** Every action in display order. */
export function allActions(analysis: Analysis): Action[] {
  return [...analysis.routine, ...analysis.indoor, ...analysis.switches, ...analysis.community];
}

function totalsOf(personal: readonly Action[], footprint: readonly Action[]): Totals {
  const smoke = personal.reduce((total, action) => total + (action.impact.cigarettesWeek ?? 0), 0);
  const cuts = [...personal, ...footprint].map((action) => action.impact.exposureCut ?? 0);
  return {
    bestCo2KgWeek: Math.max(0, ...footprint.map((action) => action.impact.co2KgWeek ?? 0)),
    cigarettesWeek: Math.round(smoke * 10) / 10,
    topExposureCut: Math.max(0, ...cuts),
  };
}
