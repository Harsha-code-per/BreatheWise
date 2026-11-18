/**
 * The contract every text-generation provider meets, so the cascade can try them in turn.
 */

/** HTTP statuses the cascade reacts to. */
export const HTTP_STATUS = {
  clientError: 400,
  tooManyRequests: 429,
  serverError: 500,
  badGateway: 502,
} as const;

/** Low temperature keeps advice consistent while still reading naturally. */
export const TEMPERATURE = 0.4;

/** One generation request. `schema` asks for JSON matching a JSON Schema when set. */
export interface AiRequest {
  system: string;
  prompt: string;
  schema: Record<string, unknown> | null;
  maxOutputTokens: number;
}

/** A named model that turns a request into text. */
export interface Provider {
  readonly name: string;
  generate: (request: AiRequest, signal: AbortSignal) => Promise<string>;
}

/** A provider failure carrying the HTTP status and any Retry-After hint. */
export class ProviderError extends Error {
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(status: number | null, retryAfterMs: number | null = null) {
    super(`Provider failed with status ${String(status)}`);
    this.name = 'ProviderError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Reads a numeric `status` from SDK errors, which differ in shape between providers. */
export function statusOf(error: unknown): number | null {
  if (error instanceof ProviderError) return error.status;
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return null;
}
