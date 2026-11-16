/** POST /api/ask: answers a family's question about their air, grounded in the engine's facts. */
import { askRequestSchema } from '../src/domain/schemas.js';
import { aiService } from './_lib/ai/instance.js';
import { createHandler } from './_lib/handler.js';
import { fetchAir } from './_lib/open-meteo.js';

export const POST = createHandler({
  name: 'ask',
  input: askRequestSchema,
  rate: { limit: 10, windowMs: 60_000 },
  run: async ({ profile, question }) =>
    aiService().answer(profile, await fetchAir(profile.place), question),
});
