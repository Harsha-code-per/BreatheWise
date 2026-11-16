import { describe, expect, it } from 'vitest';
import { buildContext } from '../../src/domain/context';
import { indoorActions } from '../../src/domain/home';
import type { Profile } from '../../src/domain/schemas';
import { makeAir, makeProfile } from '../fixtures';

function indoor(home: Partial<Profile['home']> = {}) {
  const profile = makeProfile();
  return indoorActions(buildContext({ ...profile, home: { ...profile.home, ...home } }, makeAir()));
}

describe('indoorActions', () => {
  it('suggests a DIY filter box when the home has no purifier', () => {
    expect(indoor()[0]).toMatchObject({
      id: 'diy-filter-box',
      impact: { exposureCut: 96, cigarettesWeek: 20.2 },
    });
  });

  it('reports how well an existing purifier covers the room', () => {
    const [action] = indoor({ purifierCadr: 135 });
    expect(action?.id).toBe('run-purifier');
    expect(action?.detail).toContain('covers 50% of the 270 m³/h');
  });

  it('caps coverage at 100%', () => {
    expect(indoor({ purifierCadr: 900 })[0]?.detail).toContain('covers 100%');
  });

  it('recommends an exhaust fan for LPG kitchens', () => {
    expect(indoor()[1]).toMatchObject({
      id: 'kitchen-exhaust',
      impact: { exposureCut: 12, cigarettesWeek: 0.3 },
    });
  });

  it('recommends switching away from solid fuel', () => {
    const cooking = indoor({ cooking: 'biomass' })[1];
    expect(cooking?.id).toBe('cleaner-cooking-fuel');
    expect(cooking?.impact.exposureCut).toBeGreaterThan(50);
  });

  it('always includes the no-cost hacks', () => {
    expect(indoor().map((action) => action.id)).toEqual(
      expect.arrayContaining(['no-incense', 'wet-clean', 'plants-myth']),
    );
  });
});
