import { describe, expect, it } from 'vitest';
import { listNames } from '../../src/domain/action';
import { allActions, analyse } from '../../src/domain/analysis';
import { engineBriefing } from '../../src/domain/briefing';
import { buildContext } from '../../src/domain/context';
import { briefingSchema, profileSchema } from '../../src/domain/schemas';
import { SOURCES } from '../../src/domain/sources';
import { cleanAir, makeAir, makeProfile } from '../fixtures';

describe('analyse', () => {
  const analysis = analyse(makeProfile(), makeAir());

  it('describes the air right now', () => {
    expect(analysis).toMatchObject({ placeName: 'Delhi', smogNow: true, planDate: '2026-11-20' });
    expect(analysis.band.level).toBe('very-unhealthy');
    expect(analysis.sensitiveNames).toEqual(['Mira', 'Nani']);
    expect(analysis.outlook).toHaveLength(2);
  });

  it('adds smoke avoided across personal actions but takes only the best CO₂ switch', () => {
    expect(analysis.totals).toEqual({
      bestCo2KgWeek: 13.1,
      cigarettesWeek: 21.9,
      topExposureCut: 96,
    });
  });

  it('returns every action exactly once', () => {
    const ids = allActions(analysis).map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports zero totals when nothing applies', () => {
    const quiet = analyse(
      makeProfile({
        commute: { mode: 'walk', km: 0, daysPerWeek: 0, departHour: 8, returnHour: 18 },
      }),
      cleanAir(),
    );
    expect(quiet.totals.bestCo2KgWeek).toBe(0);
  });
});

describe('buildContext', () => {
  it('falls back to the first hour when "now" is missing from the data', () => {
    const air = { ...makeAir(), now: '2026-11-25T07:00' };
    expect(buildContext(makeProfile(), air).current.time).toBe('2026-11-20T00:00');
  });

  it('rejects an empty snapshot', () => {
    expect(() => buildContext(makeProfile(), { ...makeAir(), now: 'x', hours: [] })).toThrow(
      RangeError,
    );
  });

  it('plans today when tomorrow is not in the forecast', () => {
    const ctx = buildContext(makeProfile(), makeAir('2026-11-20T22:00', 1));
    expect(ctx.planDate).toBe('2026-11-20');
  });

  it('uses the current hour for the mean when the plan day has no data', () => {
    const air = makeAir('2026-11-20T22:00', 1);
    const ctx = buildContext(makeProfile(), { ...air, hours: air.hours.slice(-1) });
    expect(ctx.meanPm25).toBe(160);
  });
});

describe('engineBriefing', () => {
  it('writes a valid briefing from the facts alone', () => {
    const briefing = engineBriefing(analyse(makeProfile(), makeAir()));
    expect(briefingSchema.parse(briefing)).toEqual(briefing);
    expect(briefing.headline).toBe('Smog is trapped over Delhi right now');
    expect(briefing.summary).toContain('Build a box-fan filter');
    expect(briefing.summary).toContain('older neighbours');
  });

  it('stays calm and short on a clean day', () => {
    const clean = analyse(makeProfile(), cleanAir());
    const briefing = engineBriefing({
      ...clean,
      routine: [],
      indoor: [],
      switches: [],
      community: [],
      totals: { bestCo2KgWeek: 0, cigarettesWeek: 0, topExposureCut: 0 },
    });
    expect(briefing.headline).toBe('Good air in Shillong today');
    expect(briefing.summary).toBe(
      'The air quality index is 14 with 9 µg/m³ of PM2.5. Air is clean. A good time to air out the home.',
    );
  });
});

describe('shared helpers', () => {
  it('joins names naturally', () => {
    const [a, b, c] = makeProfile().members;
    expect(listNames([a!])).toBe('Asha');
    expect(listNames([a!, b!, c!])).toBe('Asha, Ravi and Mira');
    expect(listNames([])).toBe('');
  });

  it('validates the fixture profile and cites unique sources', () => {
    expect(profileSchema.safeParse(makeProfile()).success).toBe(true);
    expect(new Set(SOURCES.map((source) => source.id)).size).toBe(SOURCES.length);
  });
});
