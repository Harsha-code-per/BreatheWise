/**
 * Reads and validates the AI settings from the environment once, at start-up.
 * Every key is optional: with none set, BreatheWise runs on its deterministic engine alone.
 */
import { z } from 'zod';
import { Cascade } from './cascade.js';
import { geminiProviders } from './gemini.js';
import { compatibleProvider } from './openai-compatible.js';
import type { Provider } from './provider.js';

/** Each provider gets this long before the cascade moves on. */
export const PROVIDER_TIMEOUT_MS = 10_000;
/** All providers together get this long, leaving headroom inside the 30 s function limit. */
export const CASCADE_TOTAL_MS = 20_000;

const optional = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const envSchema = z.object({
  GEMINI_API_KEY: optional,
  GEMINI_MODELS: optional,
  FALLBACK_AI_URL: optional,
  FALLBACK_AI_KEY: optional,
  FALLBACK_AI_MODEL: optional,
  AI_DAILY_BUDGET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().positive().default(900),
  ),
});

const DEFAULT_MODELS = 'gemini-3.5-flash,gemini-3.5-flash-lite';

/** Builds the provider list in priority order from environment variables. */
export function providersFrom(env: Record<string, string | undefined>): Provider[] {
  const config = envSchema.parse(env);
  const providers: Provider[] = [];
  if (config.GEMINI_API_KEY) {
    const models = (config.GEMINI_MODELS ?? DEFAULT_MODELS)
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    providers.push(...geminiProviders(config.GEMINI_API_KEY, models));
  }
  if (config.FALLBACK_AI_URL && config.FALLBACK_AI_KEY && config.FALLBACK_AI_MODEL) {
    providers.push(
      compatibleProvider({
        baseUrl: config.FALLBACK_AI_URL,
        apiKey: config.FALLBACK_AI_KEY,
        model: config.FALLBACK_AI_MODEL,
      }),
    );
  }
  return providers;
}

/** Creates the cascade the API uses, from environment variables. */
export function cascadeFrom(env: Record<string, string | undefined>): Cascade {
  const { AI_DAILY_BUDGET } = envSchema.parse(env);
  return new Cascade(providersFrom(env), {
    timeoutMs: PROVIDER_TIMEOUT_MS,
    totalMs: CASCADE_TOTAL_MS,
    dailyBudget: AI_DAILY_BUDGET,
  });
}
