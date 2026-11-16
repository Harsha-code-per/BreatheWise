/**
 * Turns a location into a place name. Browser coordinates are named with OpenStreetMap's
 * Nominatim (server-side, cached, identified per its usage policy); without coordinates the
 * approximate city Vercel derives from the network is used instead.
 */
import { z } from 'zod';
import type { Place } from '../../src/domain/schemas.js';
import { TtlCache } from './cache.js';
import { ApiError } from './errors.js';
import { getJson } from './upstream.js';

const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
/** Nominatim asks every application to identify itself. */
const USER_AGENT = 'BreatheWise/1.0 (+https://breathewise-six.vercel.app)';
const NAME_TTL_MS = 7 * 24 * 60 * 60_000;

const reversePayload = z.object({
  address: z
    .object({
      city: z.string(),
      town: z.string(),
      village: z.string(),
      suburb: z.string(),
      county: z.string(),
      state: z.string(),
      country: z.string(),
    })
    .partial()
    .optional(),
});

const names = new TtlCache<string>(1000);

/** Rounds to two decimals (about 1 km), so nothing more precise is ever stored or sent on. */
function coarse(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Names coordinates as "City, State, Country". */
export async function placeAt(lat: number, lon: number): Promise<Place> {
  const [la, lo] = [coarse(lat), coarse(lon)];
  const name = await names.getOrLoad(`${String(la)},${String(lo)}`, NAME_TTL_MS, async () => {
    const params = new URLSearchParams({
      lat: String(la),
      lon: String(lo),
      format: 'jsonv2',
      zoom: '10',
      'accept-language': 'en',
    });
    const { address = {} } = await getJson(`${REVERSE_URL}?${params.toString()}`, reversePayload, {
      'User-Agent': USER_AGENT,
    });
    const local =
      address.city ?? address.town ?? address.village ?? address.suburb ?? address.county;
    const parts = [local, address.state, address.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ').slice(0, 80) : `Near ${String(la)}, ${String(lo)}`;
  });
  return { name, lat: la, lon: lo };
}

/** The approximate place Vercel derives from the client's network, or an error when unknown. */
export function placeFromNetwork(headers: Headers): Place {
  const lat = Number(headers.get('x-vercel-ip-latitude'));
  const lon = Number(headers.get('x-vercel-ip-longitude'));
  const city = decodeURIComponent(headers.get('x-vercel-ip-city') ?? '');
  if (!headers.has('x-vercel-ip-latitude') || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiError('LOCATION_UNKNOWN');
  }
  return { name: city === '' ? 'Your area' : city, lat: coarse(lat), lon: coarse(lon) };
}
