import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dailyOutlook, isSmog, isTrapped, trappedRuns } from '../../src/domain/smog';
import { cleanestWindow, rankWindows, worstWindow } from '../../src/domain/windows';
import { makeAir, makeHour } from '../fixtures';

const day = makeAir().hours.filter((hour) => hour.time.startsWith('2026-11-20'));
const query = { date: '2026-11-20', length: 1, fromHour: 7, toHour: 20 };

describe('time windows', () => {
  it('finds the cleanest and dirtiest hour', () => {
    expect(cleanestWindow(day, query)).toEqual({
      date: '2026-11-20',
      startHour: 12,
      endHour: 13,
      meanPm25: 40,
    });
    expect(worstWindow(day, query)?.meanPm25).toBe(180);
  });

  it('averages multi-hour windows', () => {
    expect(cleanestWindow(day, { ...query, length: 2 })?.meanPm25).toBe(41);
  });

  it('skips windows with a missing hour and returns null when none fit', () => {
    const gappy = day.filter((hour) => !hour.time.endsWith('T13:00'));
    expect(rankWindows(gappy, { ...query, fromHour: 12, toHour: 16, length: 2 })).toHaveLength(1);
    expect(cleanestWindow(day, { ...query, date: '2030-01-01' })).toBeNull();
    expect(worstWindow([], query)).toBeNull();
  });

  it('always ranks windows cleanest first', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 24, maxLength: 24 }),
        (values) => {
          const hours = values.map((pm25, hour) =>
            makeHour(`2026-11-20T${String(hour).padStart(2, '0')}:00`, pm25),
          );
          const ranked = rankWindows(hours, { ...query, fromHour: 0, toHour: 24, length: 3 });
          expect(ranked).toHaveLength(22);
          ranked.slice(1).forEach((window, index) => {
            expect(window.meanPm25).toBeGreaterThanOrEqual(ranked[index]!.meanPm25);
          });
        },
      ),
    );
  });
});

describe('smog detection', () => {
  it('needs both an inversion and unhealthy PM2.5', () => {
    expect(isTrapped(makeHour('2026-11-20T06:00', 10, 150))).toBe(true);
    expect(isTrapped(makeHour('2026-11-20T06:00', 10, null))).toBe(false);
    expect(isSmog(makeHour('2026-11-20T06:00', 10, 150))).toBe(false);
    expect(isSmog(makeHour('2026-11-20T06:00', 200, 150))).toBe(true);
  });

  it('splits trapped hours into consecutive runs', () => {
    expect(trappedRuns(day, 7)).toEqual([
      { startHour: 7, endHour: 10 },
      { startHour: 18, endHour: 24 },
    ]);
  });

  it('summarises each forecast day', () => {
    const [first, second] = dailyOutlook(makeAir().hours);
    expect(first).toMatchObject({
      date: '2026-11-20',
      peakAqi: 270,
      trappedHours: 16,
      smogHours: 16,
    });
    expect(first?.meanPm25).toBe(138);
    expect(second?.date).toBe('2026-11-21');
  });
});
