import { describe, expect, it } from 'vitest';
import { analyse } from '../../src/domain/analysis';
import { engineAnswer } from '../../src/domain/answer';
import { makeAir, makeProfile } from '../fixtures';

const analysis = analyse(makeProfile(), makeAir());

describe('engineAnswer', () => {
  it.each([
    ['When can I go for a run?', 'Exercise between 12:00–13:00'],
    ['Should I open the windows?', 'Air out the home at 12:00'],
    ['Do I need a purifier?', 'box-fan filter'],
    ['Is my gas stove a problem?', 'exhaust'],
    ['How should I commute to the office?', 'Leave at 09:00'],
    ['Can my daughter walk to school?', 'walking school bus'],
    ['Which mask works?', 'N95'],
  ])('answers "%s" with the matching advice', (question, expected) => {
    expect(engineAnswer(analysis, question)).toContain(expected);
  });

  it('opens with the current air and falls back to the top actions', () => {
    const answer = engineAnswer(analysis, 'Hello?');
    expect(answer.startsWith('Right now the air in Delhi is very unhealthy (AQI 270).')).toBe(true);
    expect(answer.split('\n')).toHaveLength(4);
  });
});
