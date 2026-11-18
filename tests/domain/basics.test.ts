import { describe, expect, it } from 'vitest';
import { aqiBand, levelRank } from '../../src/domain/aqi';
import { BREATHING, cigarettes, inhaledDose, percentLess } from '../../src/domain/exposure';
import { round1 } from '../../src/domain/units';
import { cadrFor, cfmToM3h, indoorPm25 } from '../../src/domain/indoor';
import { dayOf, formatHour, hourOf } from '../../src/domain/time';

describe('aqiBand', () => {
  it.each([
    [0, 'good'],
    [50, 'good'],
    [50.4, 'good'],
    [51, 'moderate'],
    [150, 'sensitive'],
    [151, 'unhealthy'],
    [300, 'very-unhealthy'],
    [301, 'hazardous'],
    [999, 'hazardous'],
  ])('puts AQI %d in the %s band', (aqi, level) => {
    expect(aqiBand(aqi).level).toBe(level);
  });

  it('ranks levels from good to hazardous', () => {
    expect(levelRank('good')).toBe(0);
    expect(levelRank('hazardous')).toBe(5);
  });
});

describe('time helpers', () => {
  it('slices local ISO times without time-zone conversion', () => {
    expect(dayOf('2026-11-20T23:00')).toBe('2026-11-20');
    expect(hourOf('2026-11-20T07:00')).toBe(7);
    expect(formatHour(7)).toBe('07:00');
    expect(formatHour(24)).toBe('24:00');
  });
});

describe('exposure', () => {
  it('scales dose with concentration, time and breathing rate', () => {
    expect(inhaledDose(100, 2, 'rest')).toBe(200);
    expect(inhaledDose(100, 2, 'moderate')).toBe(200 * BREATHING.moderate);
  });

  it('treats 22 µg/m³ for a day as one cigarette', () => {
    expect(cigarettes(22, 24)).toBe(1);
  });

  it('reports percentage reductions, and increases as negatives', () => {
    expect(percentLess(200, 50)).toBe(75);
    expect(percentLess(100, 150)).toBe(-50);
    expect(percentLess(0, 10)).toBe(0);
    expect(round1(1.26)).toBe(1.3);
  });
});

describe('indoor mass balance', () => {
  const home = { outdoorPm25: 100, areaM2: 20, ach: 0.5 };

  it('lets in part of the outdoor smoke when no purifier runs', () => {
    expect(indoorPm25({ ...home, cadr: 0 })).toBeCloseTo((0.8 * 0.5 * 100) / 0.7, 5);
  });

  it('adds an indoor source as its stated rise when nothing filters it', () => {
    const plain = indoorPm25({ ...home, cadr: 0 });
    expect(indoorPm25({ ...home, cadr: 0, sourceRise: 25 })).toBeCloseTo(plain + 25, 5);
  });

  it('drops indoor PM2.5 sharply with a purifier', () => {
    expect(indoorPm25({ ...home, cadr: 300 })).toBeLessThan(indoorPm25({ ...home, cadr: 0 }) / 5);
  });

  it('sizes purifiers for five clean-air changes an hour', () => {
    expect(cadrFor(20)).toBe(270);
    expect(cfmToM3h(100)).toBe(170);
  });
});
