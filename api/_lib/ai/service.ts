/**
 * The AI layer the routes call. Order of preference: a cached AI result, a fresh AI result
 * that passes validation and the numbers check, then the engine's own wording. Callers
 * always get a usable answer, whatever the state of the free-tier quotas.
 */
import { createHash } from 'node:crypto';
import { analyse, allActions } from '../../../src/domain/analysis.js';
import { engineAnswer } from '../../../src/domain/answer.js';
import { engineBriefing } from '../../../src/domain/briefing.js';
import {
  briefingSchema,
  intakeSchema,
  type Intake,
  type AirSnapshot,
  type AskResponse,
  type Briefing,
  type PlanResponse,
  type Profile,
} from '../../../src/domain/schemas.js';
import { TtlCache } from '../cache.js';
import { ApiError } from '../errors.js';
import type { CascadeResult } from './cascade.js';
import { briefingRequest, factsFor, grounded, intakeRequest, questionRequest } from './prompts.js';
import type { AiRequest } from './provider.js';

/** AI results are reused for half an hour; the forecast they explain changes hourly at most. */
const AI_TTL_MS = 30 * 60_000;

/** Anything that can generate text, normally the provider cascade. */
export interface TextGenerator {
  generate: (request: AiRequest) => Promise<CascadeResult | null>;
}

/** Briefings and answers for the routes. */
export interface AiService {
  briefing: (profile: Profile, air: AirSnapshot) => Promise<PlanResponse>;
  answer: (profile: Profile, air: AirSnapshot, question: string) => Promise<AskResponse>;
  intake: (text: string) => Promise<Intake>;
}

/** Thrown inside the cache loader so engine fallbacks are never cached. */
class NoAiResult extends Error {}

/** Creates the service around a text generator. */
export function createAiService(generator: TextGenerator): AiService {
  const briefings = new TtlCache<Briefing>(300);
  const answers = new TtlCache<string>(500);

  return {
    async briefing(profile, air) {
      const analysis = analyse(profile, air);
      const facts = factsFor(analysis, profile);
      const ids = new Set(allActions(analysis).map((action) => action.id));
      try {
        const briefing = await briefings.getOrLoad(
          keyOf(profile.language, facts),
          AI_TTL_MS,
          async () => {
            const result = await generator.generate(briefingRequest(facts, profile.language));
            return validBriefing(result?.text, facts, ids) ?? Promise.reject(new NoAiResult());
          },
        );
        return { briefing, source: 'ai' };
      } catch {
        return { briefing: engineBriefing(analysis), source: 'engine' };
      }
    },

    async answer(profile, air, question) {
      const analysis = analyse(profile, air);
      const facts = factsFor(analysis, profile);
      try {
        const answer = await answers.getOrLoad(
          keyOf(profile.language, facts, question),
          AI_TTL_MS,
          async () => {
            const result = await generator.generate(
              questionRequest(facts, question, profile.language),
            );
            const text = result?.text;
            return text && grounded(text, `${facts} ${question}`)
              ? text
              : Promise.reject(new NoAiResult());
          },
        );
        return { answer, source: 'ai' };
      } catch {
        return { answer: engineAnswer(analysis, question), source: 'engine' };
      }
    },

    async intake(text) {
      const result = await generator.generate(intakeRequest(text));
      const parsed = intakeSchema.safeParse(parseJson(result?.text));
      if (!parsed.success) throw new ApiError('AI_UNAVAILABLE');
      return parsed.data;
    },
  };
}

function keyOf(...parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex');
}

/** Parses and checks an AI briefing; drops explanations for unknown actions or with invented numbers. */
export function validBriefing(
  text: string | undefined,
  facts: string,
  ids: ReadonlySet<string>,
): Briefing | null {
  const parsed = briefingSchema.safeParse(parseJson(text));
  if (!parsed.success || !grounded(`${parsed.data.headline} ${parsed.data.summary}`, facts))
    return null;
  const explanations = parsed.data.explanations.filter(
    (explanation) => ids.has(explanation.id) && grounded(explanation.why, facts),
  );
  return { ...parsed.data, explanations };
}

/** Parses JSON text, returning undefined for missing or malformed input. */
function parseJson(text: string | undefined): unknown {
  try {
    return text === undefined ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
}
