/**
 * Builds the shared context for one analysis: which day to plan, from which hour, and the
 * figures every action builder reuses.
 */
import { isSensitive, type PlanContext } from './action.js';
import { aqiBand } from './aqi.js';
import type { AirHour, AirSnapshot, Profile } from './schemas.js';
import { dayOf, hourOf } from './time.js';

/** From this hour on, too little of the day is left to plan, so the plan targets tomorrow. */
export const LAST_PLANNING_HOUR = 18;

/** First waking hour considered for outdoor plans. */
export const FIRST_WAKING_HOUR = 6;

/** Creates the plan context from a profile and a validated air snapshot. */
export function buildContext(profile: Profile, air: AirSnapshot): PlanContext {
  const current = air.hours.find((hour) => hour.time === air.now) ?? firstHour(air.hours);
  const nowHour = hourOf(air.now);
  const today = dayOf(air.now);
  const planTomorrow = nowHour >= LAST_PLANNING_HOUR;
  const planDate = planTomorrow ? nextDate(air.hours, today) : today;
  const dayHours = air.hours.filter((hour) => dayOf(hour.time) === planDate);
  const hoursForMean = dayHours.length > 0 ? dayHours : [current];
  return {
    profile,
    air,
    current,
    band: aqiBand(current.aqi),
    planDate,
    fromHour: planTomorrow ? FIRST_WAKING_HOUR : Math.max(FIRST_WAKING_HOUR, nowHour),
    dayHours,
    meanPm25: hoursForMean.reduce((sum, hour) => sum + hour.pm25, 0) / hoursForMean.length,
    sensitive: profile.members.filter(isSensitive),
  };
}

function firstHour(hours: readonly AirHour[]): AirHour {
  const [first] = hours;
  if (!first) throw new RangeError('An air snapshot needs at least one hour.');
  return first;
}

function nextDate(hours: readonly AirHour[], today: string): string {
  return hours.map((hour) => dayOf(hour.time)).find((date) => date > today) ?? today;
}
