/** POST /api/intake: Gemini fills the setup form from the family's own description. */
import { intakeRequestSchema } from '../src/domain/schemas.js';
import { aiService } from './_lib/ai/instance.js';
import { createHandler } from './_lib/handler.js';

export const POST = createHandler({
  name: 'intake',
  input: intakeRequestSchema,
  rate: { limit: 6, windowMs: 60_000 },
  run: async ({ text }) => ({ intake: await aiService().intake(text) }),
});
