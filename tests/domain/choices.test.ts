import { describe, expect, it } from 'vitest';
import { allActions, analyse } from '../../src/domain/analysis';
import { choiceImpact, toggleChoice } from '../../src/domain/choices';
import { makeAir, makeProfile } from '../fixtures';

const actions = allActions(analyse(makeProfile(), makeAir()));

describe('toggleChoice', () => {
  it('adds and removes a choice', () => {
    expect(toggleChoice([], 'air-out')).toEqual(['air-out']);
    expect(toggleChoice(['air-out'], 'air-out')).toEqual([]);
  });

  it('keeps only one way of commuting', () => {
    const cycling = toggleChoice(['air-out', 'commute-metro'], 'commute-cycle');
    expect(cycling).toEqual(['air-out', 'commute-cycle']);
    expect(toggleChoice(cycling, 'neighbour-carpool')).toEqual(['air-out', 'neighbour-carpool']);
  });
});

describe('choiceImpact', () => {
  it('adds up smoke avoided and CO₂ saved for chosen steps in the plan', () => {
    expect(choiceImpact(actions, [])).toEqual({ count: 0, cigarettesWeek: 0, co2KgWeek: 0 });
    expect(
      choiceImpact(actions, ['diy-filter-box', 'exercise-window', 'commute-metro', 'gone']),
    ).toEqual({
      count: 3,
      cigarettesWeek: 21.6,
      co2KgWeek: 10.9,
    });
  });
});
