/**
 * The one request pipeline every route uses: method, origin, content type, size, rate limit,
 * JSON parsing and schema validation run in that order before the route's own logic.
 */
import type { z } from 'zod';
import { ApiError, errorResponse, jsonResponse } from './errors.js';
import { clientKey, RateLimiter, type RateRule } from './rate-limit.js';

/** Request bodies are small JSON documents; anything bigger is refused unread. */
export const MAX_BODY_BYTES = 16_384;

const limiter = new RateLimiter();

/** How a route is wired into the pipeline. */
export interface RouteOptions<Schema extends z.ZodType, Result> {
  name: string;
  input: Schema;
  rate: RateRule;
  run: (input: z.output<Schema>, request: Request) => Promise<Result>;
}

/** Builds a Vercel web handler (`export const POST = createHandler(...)`). */
export function createHandler<Schema extends z.ZodType, Result>(
  route: RouteOptions<Schema, Result>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      const body = await readBody(request, route);
      const parsed = route.input.safeParse(body);
      if (!parsed.success) throw new ApiError('INVALID_INPUT');
      return jsonResponse(await route.run(parsed.data, request));
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error(`[api] ${route.name} failed unexpectedly`);
      return errorResponse(new ApiError('INTERNAL'));
    }
  };
}

async function readBody(
  request: Request,
  route: RouteOptions<z.ZodType, unknown>,
): Promise<unknown> {
  if (request.method !== 'POST') throw new ApiError('METHOD_NOT_ALLOWED');
  if (!isSameOrigin(request)) throw new ApiError('FORBIDDEN_ORIGIN');
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new ApiError('UNSUPPORTED_MEDIA_TYPE');
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    throw new ApiError('PAYLOAD_TOO_LARGE');
  }
  const decision = limiter.check(`${route.name}:${clientKey(request)}`, route.rate);
  if (!decision.allowed) throw new ApiError('RATE_LIMITED', decision.retryAfterSeconds);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError('PAYLOAD_TOO_LARGE');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('BAD_JSON');
  }
}

/** Browsers send Origin on cross-site POSTs; when present it must match this host. */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  return origin === null || new URL(origin).host === new URL(request.url).host;
}
