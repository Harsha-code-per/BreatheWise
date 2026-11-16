/**
 * The API's error catalogue. Every failure maps to one code, one status and one safe message,
 * so clients get predictable errors and no internal details ever leak.
 */

export type ErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'FORBIDDEN_ORIGIN'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'BAD_JSON'
  | 'INVALID_INPUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL';

const CATALOGUE: Readonly<Record<ErrorCode, { status: number; message: string }>> = {
  METHOD_NOT_ALLOWED: { status: 405, message: 'Use POST for this endpoint.' },
  FORBIDDEN_ORIGIN: { status: 403, message: 'Requests must come from this site.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'Send a JSON body.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'The request body is too large.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Please wait a moment.' },
  BAD_JSON: { status: 400, message: 'The request body is not valid JSON.' },
  INVALID_INPUT: { status: 400, message: 'Some fields are missing or out of range.' },
  UPSTREAM_UNAVAILABLE: {
    status: 502,
    message: 'Air-quality data is unavailable right now. Try again shortly.',
  },
  INTERNAL: { status: 500, message: 'Something went wrong on our side.' },
};

/** A failure the API reports to the client by its catalogue code. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly retryAfterSeconds: number | null;

  constructor(code: ErrorCode, retryAfterSeconds: number | null = null) {
    super(CATALOGUE[code].message);
    this.name = 'ApiError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** HTTP status for this error. */
  get status(): number {
    return CATALOGUE[this.code].status;
  }
}

/** JSON response that is never cached by browsers or proxies. */
export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

/** Turns an ApiError into its JSON response, adding Retry-After when known. */
export function errorResponse(error: ApiError): Response {
  const retry: Record<string, string> =
    error.retryAfterSeconds === null ? {} : { 'Retry-After': String(error.retryAfterSeconds) };
  return jsonResponse({ error: { code: error.code, message: error.message } }, error.status, retry);
}
