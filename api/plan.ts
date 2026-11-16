/**
 * POST /api/plan: the family's personalised briefing. The server fetches the air data itself,
 * so the AI only ever explains real forecasts, never figures sent by the browser.
 */
import { planRequestSchema } from '../src/domain/schemas.js';
import { aiService } from './_lib/ai/instance.js';
import { createHandler } from './_lib/handler.js';
import { fetchAir } from './_lib/open-meteo.js';

export const POST = createHandler({
  name: 'plan',
  input: planRequestSchema,
  rate: { limit: 6, windowMs: 60_000 },
  run: async ({ profile }) => aiService().briefing(profile, await fetchAir(profile.place)),
});
