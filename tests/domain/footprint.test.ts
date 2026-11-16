import { describe, expect, it } from 'vitest';
import { communityActions } from '../../src/domain/community';
import { commuteCost, commuteOptions } from '../../src/domain/commute';
import { buildContext } from '../../src/domain/context';
import type { Profile } from '../../src/domain/schemas';
import { switchActions } from '../../src/domain/switches';
import { makeAir, makeProfile } from '../fixtures';

const commute: Profile['commute'] = {
  mode: 'car',
  km: 8,
  daysPerWeek: 5,
  departHour: 8,
  returnHour: 18,
};

describe('commute costs', () => {
  it('works out weekly CO₂, time and dose', () => {
    expect(commuteCost(commute, 'car', 100)).toEqual({
      mode: 'car',
      minutesPerWeek: 218,
      co2KgPerWeek: 13.1,
      dosePerWeek: (100 * 80) / 22,
    });
  });

  it('offers only realistic modes for the distance, lowest CO₂ first', () => {
    const modes = commuteOptions(commute, 100).map((option) => option.mode);
    expect(modes).toEqual(['cycle', 'metro', 'carpool', 'bus', 'motorbike', 'car']);
    expect(commuteOptions({ ...commute, km: 2 }, 100).map((option) => option.mode)).toContain(
      'walk',
    );
  });
});

function ctx(profile: Profile) {
  return buildContext(profile, makeAir());
}

describe('switchActions', () => {
  it('offers the two lowest-carbon switches with honest breathing trade-offs', () => {
    const [cycle, metro] = switchActions(ctx(makeProfile()));
    expect(cycle).toMatchObject({
      title: 'Switch from driving alone to cycling',
      impact: { co2KgWeek: 13.1 },
    });
    expect(cycle?.detail).toContain('more PM2.5');
    expect(metro).toMatchObject({
      title: 'Switch from driving alone to the metro',
      impact: { exposureCut: 21, co2KgWeek: 10.9 },
    });
    expect(metro?.detail).toContain('no slower');
  });

  it('adds a heating swap for wood or coal heaters', () => {
    const profile = makeProfile();
    const coal = { ...profile, home: { ...profile.home, heating: 'coal' as const } };
    expect(switchActions(ctx(coal)).at(-1)?.title).toContain('coal heater');
  });

  it('suggests nothing for a family that does not commute', () => {
    const stay = makeProfile({ commute: { ...commute, daysPerWeek: 0 } });
    expect(switchActions(ctx(stay))).toEqual([]);
    expect(
      switchActions(ctx(makeProfile({ commute: { ...commute, mode: 'walk', km: 1 } }))),
    ).toEqual([]);
  });
});

describe('communityActions', () => {
  it('times a walking school bus and prices a carpool', () => {
    const actions = communityActions(ctx(makeProfile()));
    expect(actions.map((action) => action.id)).toEqual([
      'no-burning-pledge',
      'walking-bus',
      'share-filter',
      'neighbour-carpool',
    ]);
    expect(actions[1]?.title).toBe('Start a walking school bus at 09:00');
    expect(actions[3]?.impact.co2KgWeek).toBe(6.6);
  });

  it('leaves out child and car actions when they do not apply', () => {
    const profile = makeProfile({
      members: [{ id: 'sam', name: 'Sam', group: 'older', respiratory: true, outdoorWork: false }],
      commute: { ...commute, mode: 'bus' },
    });
    expect(communityActions(ctx(profile)).map((action) => action.id)).toEqual([
      'no-burning-pledge',
      'share-filter',
    ]);
  });
});
