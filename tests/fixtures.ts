import type { AirHour, AirSnapshot, Profile } from '../src/domain/schemas';

/** A typical family: two adults, a child with asthma and a grandparent. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    place: { name: 'Delhi', lat: 28.61, lon: 77.21 },
    members: [
      { id: 'asha', name: 'Asha', group: 'adult', respiratory: false, outdoorWork: false },
      { id: 'ravi', name: 'Ravi', group: 'adult', respiratory: false, outdoorWork: false },
      { id: 'mira', name: 'Mira', group: 'child', respiratory: true, outdoorWork: false },
      { id: 'nani', name: 'Nani', group: 'older', respiratory: false, outdoorWork: false },
    ],
    commute: { mode: 'car', km: 8, daysPerWeek: 5, departHour: 8, returnHour: 18 },
    home: { areaM2: 20, purifierCadr: 0, cooking: 'lpg', heating: 'none' },
    exercise: { minutes: 45, outdoors: true },
    language: 'en',
    ...overrides,
  };
}

/**
 * A winter smog day: heavy, trapped smoke overnight and in the morning, clearing in the
 * afternoon when the boundary layer rises. PM2.5 for hour h of day d is pm25(h) + 10·d.
 */
export function smogPm25(hour: number): number {
  if (hour < 9) return 180;
  if (hour < 12) return 120;
  if (hour < 17) return 40 + (hour - 12) * 2;
  return 160;
}

export function makeHour(time: string, pm25: number, blh: number | null = 800): AirHour {
  return { time, aqi: pm25 * 1.5, pm25, pm10: pm25 * 1.6, no2: 40, o3: 20, blh };
}

/** Builds `days` days of hourly data starting at 2026-11-20, local time. */
export function makeAir(now = '2026-11-20T07:00', days = 2): AirSnapshot {
  const hours: AirHour[] = [];
  for (let day = 0; day < days; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const time = `2026-11-${String(20 + day)}T${String(hour).padStart(2, '0')}:00`;
      const blh = hour < 10 || hour >= 18 ? 150 : 900;
      hours.push(makeHour(time, smogPm25(hour) + 10 * day, blh));
    }
  }
  return { place: { name: 'Delhi', lat: 28.61, lon: 77.21 }, timezone: 'Asia/Kolkata', now, hours };
}

/** A clean, breezy day with no inversion. */
export function cleanAir(now = '2026-11-20T07:00'): AirSnapshot {
  const hours = Array.from({ length: 24 }, (_, hour) =>
    makeHour(`2026-11-20T${String(hour).padStart(2, '0')}:00`, 8 + (hour % 3), 1200),
  );
  return {
    place: { name: 'Shillong', lat: 25.57, lon: 91.88 },
    timezone: 'Asia/Kolkata',
    now,
    hours,
  };
}
