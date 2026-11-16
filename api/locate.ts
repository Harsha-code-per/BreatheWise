/** POST /api/locate: names the browser's coordinates, or estimates the city from the network. */
import { locateRequestSchema } from '../src/domain/schemas.js';
import { createHandler } from './_lib/handler.js';
import { placeAt, placeFromNetwork } from './_lib/locate.js';

export const POST = createHandler({
  name: 'locate',
  input: locateRequestSchema,
  rate: { limit: 10, windowMs: 60_000 },
  run: async ({ coords }, request) =>
    coords ? placeAt(coords.lat, coords.lon) : Promise.resolve(placeFromNetwork(request.headers)),
});
