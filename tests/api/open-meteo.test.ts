import { describe, expect, it, vi } from 'vitest';
import { fetchAir, searchPlaces } from '../../api/_lib/open-meteo';
import { fakeOpenMeteo, openMeteoPayloads } from './helpers';

const place = { name: 'Delhi', lat: 28.6139, lon: 77.209 };

describe('fetchAir', () => {
  it('merges air quality with boundary-layer height by hour', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo());
    const air = await fetchAir(place);
    expect(air.now).toBe('2026-11-20T07:00');
    expect(air.hours).toHaveLength(23);
    expect(air.hours[0]).toEqual({
      time: '2026-11-20T00:00',
      aqi: 210,
      pm25: 150,
      pm10: 225,
      no2: 30,
      o3: null,
      blh: 120,
    });
    expect(air.hours[20]?.blh).toBeNull();
    expect(fetch.mock.calls[0]?.[0] as string).toContain('latitude=28.61&longitude=77.21');
  });

  it('serves repeat requests for the same grid cell from cache', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo());
    await fetchAir({ ...place, name: 'New Delhi' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['an HTTP error', () => Promise.resolve(new Response('', { status: 503 }))],
    ['a network failure', () => Promise.reject(new TypeError('offline'))],
    ['an unexpected payload', () => Promise.resolve(Response.json({ nope: true }))],
  ])('reports %s as upstream unavailable', async (_, impl) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(impl);
    await expect(fetchAir({ ...place, lat: 10 })).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('rejects a forecast with no usable hours', async () => {
    const payloads = openMeteoPayloads();
    payloads.air.hourly.us_aqi = payloads.air.hourly.time.map(() => null);
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo(payloads));
    await expect(fetchAir({ ...place, lat: 11 })).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('treats missing series values as gaps', async () => {
    const payloads = openMeteoPayloads();
    payloads.air.hourly.pm2_5 = payloads.air.hourly.pm2_5.slice(0, 5);
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo(payloads));
    expect((await fetchAir({ ...place, lat: 12 })).hours).toHaveLength(5);
  });
});

describe('searchPlaces', () => {
  it('labels places with region and country', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(fakeOpenMeteo());
    expect(await searchPlaces('Delhi')).toEqual([
      { name: 'Delhi, Delhi, India', lat: 28.65, lon: 77.23 },
    ]);
  });

  it('returns an empty list when nothing matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
    expect(await searchPlaces('Nowhereville')).toEqual([]);
  });
});
