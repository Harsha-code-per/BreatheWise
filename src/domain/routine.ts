/**
 * Low-emission daily routine: moves workouts, airing the home and commutes into the cleanest
 * hours, and keeps sensitive family members in during the worst ones.
 */
import { listNames, NO_IMPACT, type Action, type PlanContext } from './action.js';
import { levelRank } from './aqi.js';
import { cigarettes, inhaledDose, percentLess } from './exposure.js';
import { SMOG_PM25, trappedRuns } from './smog.js';
import { formatHour, hourOf } from './time.js';
import { windowRange, worstWindow, type AirWindow } from './windows.js';
import { DAYS_PER_WEEK, MINUTES_PER_HOUR, round1 } from './units.js';

/** Last hour at which an outdoor workout or airing may start. */
const OUTDOOR_UNTIL = 20;
/** Departure shifts smaller than this percentage are not worth suggesting. */
const MIN_SHIFT_GAIN = 15;
/** A workout window is at most this many hours long. */
const MAX_WORKOUT_HOURS = 3;
/** Sensitive family members are kept in for the dirtiest stretch of this many hours. */
const SHELTER_HOURS = 3;
/** Below this PM2.5 (the EPA "sensitive groups" breakpoint) the commute air is fine as it is. */
const WORTH_SHIFTING_PM25 = 35.5;

/** Routine actions always happen at a time of day. */
type Timed = Action & { when: string };

/** Builds today's routine actions in time order. */
export function routineActions(ctx: PlanContext): Action[] {
  return [exercise(ctx), airing(ctx), commuteShift(ctx), windowsShut(ctx), shelter(ctx)]
    .filter((action): action is Timed => action !== null)
    .sort((a, b) => a.when.localeCompare(b.when));
}

function span(slot: AirWindow): string {
  return `${formatHour(slot.startHour)}–${formatHour(slot.endHour)}`;
}

function query(ctx: PlanContext, length: number) {
  return { date: ctx.planDate, length, fromHour: ctx.fromHour, toHour: OUTDOOR_UNTIL };
}

function exercise(ctx: PlanContext): Timed | null {
  const { minutes, outdoors } = ctx.profile.exercise;
  if (minutes === 0 || !outdoors) return null;
  const length = Math.min(MAX_WORKOUT_HOURS, Math.ceil(minutes / MINUTES_PER_HOUR));
  const range = windowRange(ctx.dayHours, query(ctx, length));
  if (!range) return null;
  const { best, worst } = range;
  const hours = minutes / MINUTES_PER_HOUR;
  const tooDirty = best.meanPm25 >= SMOG_PM25;
  return {
    id: 'exercise-window',
    kind: 'routine',
    title: tooDirty ? 'Move your workout indoors today' : `Exercise between ${span(best)}`,
    detail: tooDirty
      ? `Even the cleanest hour outside has ${Math.round(best.meanPm25)} µg/m³ of PM2.5. Hard breathing pulls in four times more of it, so train indoors with the windows shut.`
      : `This is the cleanest stretch of the day (${Math.round(best.meanPm25)} µg/m³ of PM2.5, against ${Math.round(worst.meanPm25)} at the worst time).`,
    when: formatHour(best.startHour),
    impact: {
      ...NO_IMPACT,
      exposureCut: tooDirty
        ? null
        : percentLess(
            inhaledDose(worst.meanPm25, hours, 'moderate'),
            inhaledDose(best.meanPm25, hours, 'moderate'),
          ),
      cigarettesWeek: round1(cigarettes(worst.meanPm25 - best.meanPm25, hours) * DAYS_PER_WEEK),
    },
  };
}

function airing(ctx: PlanContext): Timed | null {
  const range = windowRange(ctx.dayHours, query(ctx, 1));
  if (!range || range.best.meanPm25 >= SMOG_PM25) return null;
  const { best, worst } = range;
  return {
    id: 'air-out',
    kind: 'routine',
    title: `Air out the home at ${formatHour(best.startHour)}`,
    detail:
      'Open windows wide for 10 minutes to flush out cooking fumes and CO₂, then shut them again.',
    when: formatHour(best.startHour),
    impact: { ...NO_IMPACT, exposureCut: percentLess(worst.meanPm25, best.meanPm25) },
  };
}

function commuteShift(ctx: PlanContext): Timed | null {
  const { daysPerWeek, departHour } = ctx.profile.commute;
  const usual = ctx.dayHours.find((hour) => hourOf(hour.time) === departHour);
  if (daysPerWeek === 0 || !usual || usual.pm25 < WORTH_SHIFTING_PM25) return null;
  const best = ctx.dayHours
    .filter((hour) => Math.abs(hourOf(hour.time) - departHour) <= 1)
    .reduce((cleanest, hour) => (hour.pm25 < cleanest.pm25 ? hour : cleanest), usual);
  const gain = percentLess(usual.pm25, best.pm25);
  if (gain < MIN_SHIFT_GAIN) return null;
  return {
    id: 'commute-shift',
    kind: 'routine',
    title: `Leave at ${formatHour(hourOf(best.time))} instead of ${formatHour(departHour)}`,
    detail: `The street air is cleaner then: ${Math.round(best.pm25)} instead of ${Math.round(usual.pm25)} µg/m³ of PM2.5.`,
    when: formatHour(hourOf(best.time)),
    impact: { ...NO_IMPACT, exposureCut: gain },
  };
}

function windowsShut(ctx: PlanContext): Timed | null {
  const [first, next] = trappedRuns(ctx.dayHours, ctx.fromHour);
  if (!first) return null;
  const again = next
    ? ` It returns at ${formatHour(next.startHour)}, so close them again then.`
    : '';
  return {
    id: 'windows-shut',
    kind: 'routine',
    title: `Keep windows shut ${formatHour(first.startHour)}–${formatHour(first.endHour)}`,
    detail: `A temperature inversion holds smoke close to the ground then, so opening up would let it in.${again}`,
    when: formatHour(first.startHour),
    impact: NO_IMPACT,
  };
}

function shelter(ctx: PlanContext): Timed | null {
  const worst = worstWindow(ctx.dayHours, query(ctx, SHELTER_HOURS));
  if (ctx.sensitive.length === 0 || !worst || levelRank(ctx.band.level) < levelRank('sensitive')) {
    return null;
  }
  return {
    id: 'shelter-sensitive',
    kind: 'routine',
    title: `Keep ${listNames(ctx.sensitive)} indoors ${span(worst)}`,
    detail:
      'These are the dirtiest hours. Children, older adults, pregnant people and anyone with asthma feel smog first.',
    when: formatHour(worst.startHour),
    impact: NO_IMPACT,
  };
}
