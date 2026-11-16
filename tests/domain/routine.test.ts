import { describe, expect, it } from 'vitest';
import { buildContext } from '../../src/domain/context';
import { routineActions } from '../../src/domain/routine';
import type { Profile } from '../../src/domain/schemas';
import { cleanAir, makeAir, makeHour, makeProfile } from '../fixtures';

function routine(profile: Profile = makeProfile(), air = makeAir()) {
  return routineActions(buildContext(profile, air));
}

const byId = (actions: ReturnType<typeof routine>, id: string) =>
  actions.find((action) => action.id === id);

describe('routineActions on a smog day', () => {
  const actions = routine();

  it('lists actions in time order', () => {
    expect(actions.map((action) => action.when)).toEqual([
      '07:00',
      '09:00',
      '12:00',
      '12:00',
      '17:00',
    ]);
  });

  it('moves exercise to the cleanest hour and measures the gain', () => {
    expect(byId(actions, 'exercise-window')).toMatchObject({
      title: 'Exercise between 12:00–13:00',
      impact: { exposureCut: 78, cigarettesWeek: 1.4 },
    });
  });

  it('times airing, the commute and shut windows around the inversion', () => {
    expect(byId(actions, 'air-out')?.impact.exposureCut).toBe(78);
    expect(byId(actions, 'commute-shift')).toMatchObject({
      title: 'Leave at 09:00 instead of 08:00',
      impact: { exposureCut: 33 },
    });
    expect(byId(actions, 'windows-shut')?.title).toBe('Keep windows shut 07:00–10:00');
    expect(byId(actions, 'windows-shut')?.detail).toContain('It returns at 18:00');
  });

  it('keeps sensitive members in during the worst three hours', () => {
    expect(byId(actions, 'shelter-sensitive')?.title).toBe(
      'Keep Mira and Nani indoors 17:00–20:00',
    );
  });
});

describe('routineActions edge cases', () => {
  it('plans tomorrow once the evening has started', () => {
    const actions = routine(makeProfile(), makeAir('2026-11-20T21:00'));
    expect(byId(actions, 'exercise-window')?.title).toBe('Exercise between 12:00–13:00');
    expect(byId(actions, 'windows-shut')?.title).toBe('Keep windows shut 06:00–10:00');
  });

  it('sends the workout indoors when even the cleanest hour is unhealthy', () => {
    const air = makeAir();
    const smoggy = { ...air, hours: air.hours.map((hour) => ({ ...hour, pm25: 90 + hour.pm25 })) };
    const actions = routine(makeProfile(), smoggy);
    expect(byId(actions, 'exercise-window')).toMatchObject({
      title: 'Move your workout indoors today',
      impact: { exposureCut: null },
    });
    expect(byId(actions, 'air-out')).toBeUndefined();
  });

  it('skips actions that do not apply to the family', () => {
    const adults = makeProfile({
      members: [{ id: 'sam', name: 'Sam', group: 'adult', respiratory: false, outdoorWork: false }],
      exercise: { minutes: 0, outdoors: false },
      commute: { mode: 'car', km: 5, daysPerWeek: 0, departHour: 8, returnHour: 18 },
    });
    expect(routine(adults).map((action) => action.id)).toEqual(['windows-shut', 'air-out']);
  });

  it('suggests no shift or shelter on a clean, even day', () => {
    const ids = routine(makeProfile(), cleanAir()).map((action) => action.id);
    expect(ids).not.toContain('commute-shift');
    expect(ids).not.toContain('shelter-sensitive');
    expect(ids).not.toContain('windows-shut');
  });

  it('does not shift the commute for a small gain, and mentions no second inversion late in the day', () => {
    const air = makeAir('2026-11-20T19:00');
    const flat = { ...air, hours: air.hours.map((hour) => ({ ...hour, pm25: 100 })) };
    const actions = routine(makeProfile(), flat);
    expect(byId(actions, 'commute-shift')).toBeUndefined();
    expect(byId(actions, 'windows-shut')?.detail).not.toContain('returns');
  });

  it('drops time-based actions when the day has no usable hours', () => {
    const air = { ...makeAir(), hours: [makeHour('2026-11-20T05:00', 50)] };
    const late = makeProfile({
      commute: { mode: 'bus', km: 4, daysPerWeek: 5, departHour: 7, returnHour: 17 },
    });
    expect(routine(late, air)).toEqual([]);
  });
});
