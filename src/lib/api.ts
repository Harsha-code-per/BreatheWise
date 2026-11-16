/**
 * Browser client for the BreatheWise API. Every response is validated with the same schemas
 * the server uses, so the UI never renders data of an unexpected shape.
 */
import type { z } from 'zod';
import {
  airSnapshotSchema,
  askResponseSchema,
  placeListSchema,
  planResponseSchema,
  type AirSnapshot,
  type AskResponse,
  type Place,
  type PlanResponse,
  type Profile,
} from '../domain/schemas.js';

/** A request that failed, with a message written for the person using the app. */
export class RequestFailed extends Error {
  override name = 'RequestFailed';
}

const OFFLINE = 'BreatheWise could not reach the server. Check your connection and try again.';

function messageOf(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) return null;
  const { error } = data;
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : null;
}

async function postJson<S extends z.ZodType>(
  path: string,
  body: unknown,
  schema: S,
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new RequestFailed(OFFLINE);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new RequestFailed(messageOf(data) ?? OFFLINE);
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new RequestFailed('The server sent an unexpected reply. Please try again.');
  return parsed.data;
}

/** Typed calls to each endpoint. */
export const api = {
  /** Hourly forecast for a place. */
  air: (place: Place): Promise<AirSnapshot> => postJson('air', { place }, airSnapshotSchema),
  /** Places matching a search. */
  places: async (query: string): Promise<Place[]> =>
    (await postJson('places', { query }, placeListSchema)).places,
  /** The family's briefing, written by AI when available. */
  plan: (profile: Profile): Promise<PlanResponse> =>
    postJson('plan', { profile }, planResponseSchema),
  /** An answer to a question about the family's air. */
  ask: (profile: Profile, question: string): Promise<AskResponse> =>
    postJson('ask', { profile, question }, askResponseSchema),
};
