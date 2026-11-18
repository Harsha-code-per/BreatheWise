/**
 * Client for the free, keyless Open-Meteo APIs: air quality (CAMS), boundary-layer height
 * and place search. Responses are validated, merged by hour and cached per ~1 km grid cell.
 */
import { z } from 'zod';
import {
  airSnapshotSchema,
  type AirHour,
  type AirSnapshot,
  type Place,
} from '../../src/domain/schemas.js';
import { placeName } from '../../src/domain/names.js';
import { startOfHour } from '../../src/domain/time.js';
import { DAY_MS, MINUTE_MS } from '../../src/domain/units.js';
import { TtlCache } from './cache.js';
import { ApiError } from './errors.js';
import { getJson } from './upstream.js';

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
/** CAMS updates hourly; a quarter hour keeps the forecast fresh without repeat calls. */
const AIR_TTL_MINUTES = 15;
const AIR_TTL_MS = AIR_TTL_MINUTES * MINUTE_MS;
const PLACE_TTL_MS = DAY_MS;
const CACHE_SIZE = 500;
const SEARCH_RESULTS = '6';
const FORECAST_DAYS = '3';
const AIR_VARIABLES = 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone';

const series = z.array(z.number().nullable());
const airPayload = z.object({
  timezone: z.string(),
  current: z.object({ time: z.string() }),
  hourly: z.object({
    time: z.array(z.string()),
    us_aqi: series,
    pm2_5: series,
    pm10: series,
    nitrogen_dioxide: series,
    ozone: series,
  }),
});
const weatherPayload = z.object({
  hourly: z.object({ time: z.array(z.string()), boundary_layer_height: series }),
});
const geocodePayload = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
});

const airCache = new TtlCache<AirSnapshot>(CACHE_SIZE);
const placeCache = new TtlCache<Place[]>(CACHE_SIZE);

function at(values: readonly (number | null)[], index: number): number | null {
  return values[index] ?? null;
}

/**
 * Joins the two feeds by hour. Hours missing AQI, PM2.5 or PM10 are dropped; the optional
 * pollutants and the boundary-layer height may be null.
 */
function mergeHours(
  air: z.infer<typeof airPayload>,
  weather: z.infer<typeof weatherPayload>,
): AirHour[] {
  const blhByTime = new Map(
    weather.hourly.time.map((time, i) => [time, at(weather.hourly.boundary_layer_height, i)]),
  );
  const { hourly } = air;
  return hourly.time.flatMap((time, i): AirHour[] => {
    const [aqi, pm25, pm10] = [at(hourly.us_aqi, i), at(hourly.pm2_5, i), at(hourly.pm10, i)];
    if (aqi === null || pm25 === null || pm10 === null) return [];
    const extra = {
      no2: at(hourly.nitrogen_dioxide, i),
      o3: at(hourly.ozone, i),
      blh: blhByTime.get(time) ?? null,
    };
    return [{ time, aqi, pm25, pm10, ...extra }];
  });
}

/** Hourly air quality with boundary-layer height for a place, cached for 15 minutes. */
export async function fetchAir(place: Place): Promise<AirSnapshot> {
  const lat = place.lat.toFixed(2);
  const lon = place.lon.toFixed(2);
  return airCache.getOrLoad(`${lat},${lon}`, AIR_TTL_MS, async () => {
    const common = `latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=${FORECAST_DAYS}`;
    const [air, weather] = await Promise.all([
      getJson(`${AIR_URL}?${common}&current=us_aqi&hourly=${AIR_VARIABLES}`, airPayload),
      getJson(`${WEATHER_URL}?${common}&hourly=boundary_layer_height`, weatherPayload),
    ]);
    const now = startOfHour(air.current.time);
    const hours = mergeHours(air, weather);
    const snapshot = airSnapshotSchema.safeParse({ place, timezone: air.timezone, now, hours });
    if (!snapshot.success) throw new ApiError('UPSTREAM_UNAVAILABLE');
    return snapshot.data;
  });
}

/** Up to six places matching a search, cached for a day. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const key = query.toLowerCase();
  return placeCache.getOrLoad(key, PLACE_TTL_MS, async () => {
    const params = new URLSearchParams({
      name: query,
      count: SEARCH_RESULTS,
      language: 'en',
      format: 'json',
    });
    const { results = [] } = await getJson(`${GEOCODE_URL}?${params.toString()}`, geocodePayload);
    return results.map((result) => ({
      name: placeName([result.name, result.admin1, result.country]),
      lat: result.latitude,
      lon: result.longitude,
    }));
  });
}
