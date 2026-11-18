/** POST /api/places: place search for the location picker. */
import { placeQuerySchema } from '../src/domain/schemas.js';
import { MINUTE_MS } from '../src/domain/units.js';
import { createHandler } from './_lib/handler.js';
import { searchPlaces } from './_lib/open-meteo.js';

export const POST = createHandler({
  name: 'places',
  input: placeQuerySchema,
  rate: { limit: 30, windowMs: MINUTE_MS },
  run: async ({ query }) => ({ places: await searchPlaces(query) }),
});
