/**
 * The engine's own briefing, used whenever the AI is unavailable or rate limited. It is
 * written from the same facts the AI receives, so the page never breaks or goes blank.
 */
import type { Action } from './action.js';
import { allActions, type Analysis } from './analysis.js';
import { levelRank } from './aqi.js';
import type { Briefing } from './schemas.js';

/** Builds a plain-language briefing straight from the analysis. */
export function engineBriefing(analysis: Analysis): Briefing {
  const { band, current, placeName, totals } = analysis;
  const serious = levelRank(band.level) >= levelRank('unhealthy');
  const headline = analysis.smogNow
    ? `Smog is trapped over ${placeName} right now`
    : `${band.label} air in ${placeName} today`;
  const top = allActions(analysis).reduce<Action | undefined>(
    (best, action) => (cutOf(action) > (best ? cutOf(best) : 0) ? action : best),
    undefined,
  );
  const parts = [
    `The air quality index is ${Math.round(current.aqi)} with ${Math.round(current.pm25)} µg/m³ of PM2.5. ${band.guidance}`,
    top ? `Start with "${top.title}": it cuts that exposure by ${cutOf(top)}%.` : '',
    totals.cigarettesWeek > 0
      ? `Following the whole plan avoids smoke roughly equal to ${totals.cigarettesWeek} cigarettes per person this week.`
      : '',
    totals.bestCo2KgWeek > 0
      ? `Your best travel switch would save about ${totals.bestCo2KgWeek} kg of CO₂ a week.`
      : '',
    serious ? 'Check on older neighbours and anyone with asthma.' : '',
  ];
  return { headline, summary: parts.filter(Boolean).join(' '), explanations: [] };
}

function cutOf(action: Action): number {
  return action.impact.exposureCut ?? 0;
}
