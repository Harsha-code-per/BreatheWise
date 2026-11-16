/**
 * Fetches JSON from a third-party API with a timeout and schema validation. Any failure,
 * whether network, HTTP status or unexpected shape, becomes one `UPSTREAM_UNAVAILABLE` error.
 */
import type { z } from 'zod';
import { ApiError } from './errors.js';

/** Upstream services get this long before the request is abandoned. */
const TIMEOUT_MS = 6000;

/** GETs `url` and returns its body parsed by `schema`. */
export async function getJson<S extends z.ZodType>(
  url: string,
  schema: S,
  headers: Record<string, string> = {},
): Promise<z.output<S>> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new ApiError('UPSTREAM_UNAVAILABLE');
    return schema.parse(await response.json());
  } catch {
    throw new ApiError('UPSTREAM_UNAVAILABLE');
  }
}
