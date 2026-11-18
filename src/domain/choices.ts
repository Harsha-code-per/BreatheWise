/**
 * The family's chosen actions and their combined effect. Smoke avoided adds up across
 * personal actions; ways of commuting are alternatives, so only one can be chosen at a time.
 */
import type { Action } from './action.js';
import { round1 } from './units.js';

/** Combined weekly effect of the chosen actions. */
export interface ChoiceImpact {
  count: number;
  cigarettesWeek: number;
  co2KgWeek: number;
}

/** True for actions that change how someone commutes; choosing one replaces another. */
function isCommute(id: string): boolean {
  return id.startsWith('commute-') || id === 'neighbour-carpool';
}

/** Adds or removes `id`, keeping at most one commute alternative. */
export function toggleChoice(chosen: readonly string[], id: string): string[] {
  if (chosen.includes(id)) return chosen.filter((item) => item !== id);
  const kept = isCommute(id) ? chosen.filter((item) => !isCommute(item)) : chosen;
  return [...kept, id];
}

/** Totals the effect of the chosen actions that appear in today's plan. */
export function choiceImpact(actions: readonly Action[], chosen: readonly string[]): ChoiceImpact {
  const picked = actions.filter((action) => chosen.includes(action.id));
  const sum = (pick: (action: Action) => number | null) =>
    round1(picked.reduce((total, action) => total + Math.max(0, pick(action) ?? 0), 0));
  return {
    count: picked.length,
    cigarettesWeek: sum((action) => action.impact.cigarettesWeek),
    co2KgWeek: sum((action) => action.impact.co2KgWeek),
  };
}
