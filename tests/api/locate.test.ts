import { describe, expect, it, vi } from 'vitest';
import { POST as intake } from '../../api/intake';
import { POST as locate } from '../../api/locate';
import { placeAt, placeFromNetwork } from '../../api/_lib/locate';
import { post } from './helpers';

describe('placeAt', () => {
  it('names coordinates from OpenStreetMap, rounded to about a kilometre', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' } }),
      );
    expect(await placeAt(13.08271, 80.27072)).toEqual({
      name: 'Chennai, Tamil Nadu, India',
      lat: 13.08,
      lon: 80.27,
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url as string).toContain('lat=13.08&lon=80.27');
    expect(init?.headers).toEqual({ 'User-Agent': expect.stringContaining('BreatheWise') });
  });

  it('falls back to towns, villages and finally to coordinates', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({ address: { village: 'Kodaikanal', country: 'India' } }),
      )
      .mockResolvedValueOnce(Response.json({}));
    expect((await placeAt(10.23, 77.48)).name).toBe('Kodaikanal, India');
    expect((await placeAt(0.5, 0.5)).name).toBe('Near 0.5, 0.5');
  });
});

describe('placeFromNetwork', () => {
  it('reads the city Vercel derives from the network', () => {
    const headers = new Headers({
      'x-vercel-ip-city': 'Bengaluru',
      'x-vercel-ip-latitude': '12.9719',
      'x-vercel-ip-longitude': '77.5937',
    });
    expect(placeFromNetwork(headers)).toEqual({ name: 'Bengaluru', lat: 12.97, lon: 77.59 });
    expect(
      placeFromNetwork(new Headers({ 'x-vercel-ip-latitude': '1', 'x-vercel-ip-longitude': '2' }))
        .name,
    ).toBe('Your area');
  });

  it.each([
    ['no headers', new Headers()],
    [
      'broken coordinates',
      new Headers({ 'x-vercel-ip-latitude': 'x', 'x-vercel-ip-longitude': '2' }),
    ],
    [
      'a missing longitude',
      new Headers({ 'x-vercel-ip-latitude': '1', 'x-vercel-ip-longitude': 'y' }),
    ],
  ])('reports an unknown location with %s', (_, headers) => {
    expect(() => placeFromNetwork(headers)).toThrow(
      expect.objectContaining({ code: 'LOCATION_UNKNOWN' }),
    );
  });
});

describe('location and intake routes', () => {
  it('locates by coordinates or by network', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ address: { town: 'Ooty' } }));
    expect(
      await (await locate(post('locate', { coords: { lat: 11.41, lon: 76.69 } }))).json(),
    ).toMatchObject({ name: 'Ooty' });
    const network = await locate(
      post(
        'locate',
        { coords: null },
        { 'x-vercel-ip-latitude': '11', 'x-vercel-ip-longitude': '76', 'x-vercel-ip-city': 'Ooty' },
      ),
    );
    expect(await network.json()).toEqual({ name: 'Ooty', lat: 11, lon: 76 });
    expect((await locate(post('locate', { coords: null }))).status).toBe(404);
  });

  it('reports that Gemini is unavailable when no AI key is set', async () => {
    const response = await intake(post('intake', { text: 'Two of us in Delhi.' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'AI_UNAVAILABLE' } });
  });
});
