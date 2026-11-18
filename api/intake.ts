/** POST /api/intake: Gemini fills the setup form from the family's own description. */
import { intakeRequestSchema } from '../src/domain/schemas.js';
import { MINUTE_MS } from '../src/domain/units.js';
import { aiService } from './_lib/ai/instance.js';
import { createHandler } from './_lib/handler.js';

export const POST = createHandler({
  name: 'intake',
  input: intakeRequestSchema,
  rate: { limit: 6, windowMs: MINUTE_MS },
  run: async ({ text }) => ({ intake: await aiService().intake(text) }),
});
