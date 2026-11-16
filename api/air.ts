/** POST /api/air: hourly air quality and boundary-layer height for a place. */
import { airRequestSchema } from '../src/domain/schemas.js';
import { createHandler } from './_lib/handler.js';
import { fetchAir } from './_lib/open-meteo.js';

export const POST = createHandler({
  name: 'air',
  input: airRequestSchema,
  rate: { limit: 30, windowMs: 60_000 },
  run: ({ place }) => fetchAir(place),
});
