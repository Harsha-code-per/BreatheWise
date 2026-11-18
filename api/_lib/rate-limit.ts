/**
 * Sliding-window rate limiter kept in memory per server instance. It protects the free
 * upstream quotas from bursts; on serverless hosts each warm instance keeps its own window.
 */

import { MS_PER_SECOND } from '../../src/domain/units.js';

/** At most `limit` requests per `windowMs` for one client. */
export interface RateRule {
  limit: number;
  windowMs: number;
}

/** Result of a rate-limit check. */
export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Clients tracked at once; the least recently seen are dropped beyond this. */
const MAX_CLIENTS = 5000;

/** Tracks request timestamps per key. `now` is injectable so tests control time. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Records a request for `key` if it is within the rule, otherwise says when to retry. */
  check(key: string, rule: RateRule): RateDecision {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < rule.windowMs);
    this.hits.delete(key);
    const [oldest] = recent;
    if (oldest !== undefined && recent.length >= rule.limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((oldest + rule.windowMs - now) / MS_PER_SECOND),
      };
    }
    this.hits.set(key, [...recent, now]);
    this.evictOverflow();
    return { allowed: true };
  }

  private evictOverflow(): void {
    for (const key of this.hits.keys()) {
      if (this.hits.size <= MAX_CLIENTS) return;
      this.hits.delete(key);
    }
  }
}

/** Best client address available: Vercel sets x-real-ip and overwrites x-forwarded-for. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    request.headers.get('x-real-ip') ??
    (forwarded === undefined || forwarded === '' ? 'unknown' : forwarded)
  );
}
