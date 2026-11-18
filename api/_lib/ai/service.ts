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
import { MINUTE_MS } from '../../../src/domain/units.js';
import { TtlCache } from '../cache.js';
import { ApiError } from '../errors.js';
import type { CascadeResult } from './cascade.js';
import { briefingRequest, factsFor, grounded, intakeRequest, questionRequest } from './prompts.js';
import type { AiRequest } from './provider.js';

/** AI results are reused for half an hour; the forecast they explain changes hourly at most. */
const AI_TTL_MINUTES = 30;
const AI_TTL_MS = AI_TTL_MINUTES * MINUTE_MS;
/** Distinct briefings and answers kept per warm instance. */
const BRIEFING_CACHE_SIZE = 300;
const ANSWER_CACHE_SIZE = 500;

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

/** What the briefing and answer paths share: the generator and a cache for its results. */
interface Deps<T> {
  generator: TextGenerator;
  cache: TtlCache<T>;
}

async function briefingFor(
  { generator, cache }: Deps<Briefing>,
  profile: Profile,
  air: AirSnapshot,
): Promise<PlanResponse> {
  const analysis = analyse(profile, air);
  const facts = factsFor(analysis, profile);
  const ids = new Set(allActions(analysis).map((action) => action.id));
  const load = async () => {
    const result = await generator.generate(briefingRequest(facts, profile.language));
    return orNoResult(validBriefing(result?.text, facts, ids));
  };
  const { value, source } = await aiOrEngine(
    () => cache.getOrLoad(keyOf(profile.language, facts), AI_TTL_MS, load),
    () => engineBriefing(analysis),
  );
  return { briefing: value, source };
}

async function answerFor(
  { generator, cache }: Deps<string>,
  profile: Profile,
  ask: { air: AirSnapshot; question: string },
): Promise<AskResponse> {
  const analysis = analyse(profile, ask.air);
  const facts = factsFor(analysis, profile);
  const load = async () => {
    const result = await generator.generate(questionRequest(facts, ask.question, profile.language));
    const text = result?.text;
    return orNoResult(text && grounded(text, `${facts} ${ask.question}`) ? text : null);
  };
  const { value, source } = await aiOrEngine(
    () => cache.getOrLoad(keyOf(profile.language, facts, ask.question), AI_TTL_MS, load),
    () => engineAnswer(analysis, ask.question),
  );
  return { answer: value, source };
}

/** Creates the service around a text generator. */
export function createAiService(generator: TextGenerator): AiService {
  const briefings = { generator, cache: new TtlCache<Briefing>(BRIEFING_CACHE_SIZE) };
  const answers = { generator, cache: new TtlCache<string>(ANSWER_CACHE_SIZE) };
  return {
    briefing: (profile, air) => briefingFor(briefings, profile, air),
    answer: (profile, air, question) => answerFor(answers, profile, { air, question }),
    async intake(text) {
      const result = await generator.generate(intakeRequest(text));
      const parsed = intakeSchema.safeParse(parseJson(result?.text));
      if (!parsed.success) throw new ApiError('AI_UNAVAILABLE');
      return parsed.data;
    },
  };
}

/** Uses the AI result when there is one; any failure falls back to the engine's own wording. */
async function aiOrEngine<T>(
  ai: () => Promise<T>,
  engine: () => T,
): Promise<{ value: T; source: 'ai' | 'engine' }> {
  try {
    return { value: await ai(), source: 'ai' };
  } catch {
    return { value: engine(), source: 'engine' };
  }
}

/** Rejects inside a cache loader so that a missing AI result is never cached. */
function orNoResult<T>(value: T | null): Promise<T> | T {
  return value ?? Promise.reject(new NoAiResult());
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
