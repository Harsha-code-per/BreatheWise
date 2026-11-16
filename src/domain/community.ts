/**
 * Community actions: smog is shared, so the biggest wins come from neighbours acting together.
 */
import { NO_IMPACT, type Action, type PlanContext } from './action.js';
import { CO2_PER_KM } from './commute.js';
import { formatHour } from './time.js';
import { cleanestWindow } from './windows.js';

/** Morning hours in which a school run usually happens. */
const SCHOOL_RUN = { fromHour: 6, toHour: 10 } as const;

/** Builds neighbourhood actions, using the forecast where timing matters. */
export function communityActions(ctx: PlanContext): Action[] {
  const actions = [noBurning(), schoolRun(ctx), sharedFilter(), carpool(ctx)];
  return actions.filter((action): action is Action => action !== null);
}

function noBurning(): Action {
  return {
    id: 'no-burning-pledge',
    kind: 'community',
    title: 'Agree a no-burning pledge for leaves and rubbish',
    detail:
      'Open burning releases smoke right where people breathe. Ask your housing society or ward to arrange collection instead, and report fires to the local authority.',
    when: null,
    impact: NO_IMPACT,
  };
}

function schoolRun(ctx: PlanContext): Action | null {
  const window = cleanestWindow(ctx.dayHours, { date: ctx.planDate, length: 1, ...SCHOOL_RUN });
  if (!window || !ctx.profile.members.some((member) => member.group === 'child')) return null;
  return {
    id: 'walking-bus',
    kind: 'community',
    title: `Start a walking school bus at ${formatHour(window.startHour)}`,
    detail:
      'Parents take turns walking children to school together on quieter streets, at the cleanest morning hour, which also takes cars off the road.',
    when: formatHour(window.startHour),
    impact: NO_IMPACT,
  };
}

function sharedFilter(): Action {
  return {
    id: 'share-filter',
    kind: 'community',
    title: 'Build box-fan filters together for older neighbours',
    detail:
      'A group build costs less per box, and older people living alone are the most at risk on smog days.',
    when: null,
    impact: NO_IMPACT,
  };
}

function carpool(ctx: PlanContext): Action | null {
  const { mode, km, daysPerWeek } = ctx.profile.commute;
  if (mode !== 'car' || km === 0 || daysPerWeek === 0) return null;
  const saved = km * 2 * daysPerWeek * (CO2_PER_KM.car - CO2_PER_KM.carpool);
  return {
    id: 'neighbour-carpool',
    kind: 'community',
    title: 'Share the drive with a neighbour',
    detail:
      'Two people in one car halve each person’s commute emissions and the traffic at the school gate.',
    when: null,
    impact: { ...NO_IMPACT, co2KgWeek: Math.round(saved * 10) / 10 },
  };
}
