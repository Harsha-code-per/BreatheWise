/**
 * Tries providers in order until one answers. A provider that is rate limited, failing or
 * slow is put on cooldown so later requests skip it, and a daily budget keeps usage inside
 * free-tier quotas. When everything is exhausted it returns null and callers use the engine.
 */
import { dayOf } from '../../../src/domain/time.js';
import { HOUR_MS, MINUTE_MS, MS_PER_SECOND } from '../../../src/domain/units.js';
import { HTTP_STATUS, ProviderError, statusOf, type AiRequest, type Provider } from './provider.js';

/** Cooldown after a 429 without a Retry-After header. */
const RATE_LIMIT_COOLDOWN_MS = MINUTE_MS;
/** Cooldown after a server error, timeout or network failure. Free-tier overload spikes pass quickly. */
const TRANSIENT_COOLDOWN_MS = 10 * MS_PER_SECOND;
/** Cooldown when the request itself is rejected (bad key or unknown model), which will not heal soon. */
const CONFIG_COOLDOWN_MS = HOUR_MS;

/** Tuning for one cascade: per-attempt timeout, total time for a request, and calls per day. */
export interface CascadeOptions {
  timeoutMs: number;
  totalMs: number;
  dailyBudget: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** An attempt is not worth starting with less time than this left. */
const MIN_ATTEMPT_MS = 2000;
/** "Busy" (5xx) answers are retried once on the same model after a short pause. */
const ATTEMPTS_PER_PROVIDER = 2;
const RETRY_PAUSE_MS = 700;

/** When a request must finish and how many tries the current provider has left. */
interface Limits {
  deadline: number;
  tries: number;
}

/** The text and which provider wrote it. */
export interface CascadeResult {
  text: string;
  provider: string;
}

/** Ordered provider fallback with cooldowns and a daily call budget. */
export class Cascade {
  private readonly providers: readonly Provider[];
  private readonly options: Required<CascadeOptions>;
  private readonly coolingUntil = new Map<string, number>();
  private budgetDay = '';
  private callsToday = 0;

  constructor(providers: readonly Provider[], options: CascadeOptions) {
    this.providers = providers;
    this.options = {
      now: Date.now,
      sleep: (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        }),
      ...options,
    };
  }

  /** Generates text with the first available provider, or returns null if none can answer. */
  async generate(request: AiRequest): Promise<CascadeResult | null> {
    const deadline = this.options.now() + this.options.totalMs;
    for (const provider of this.providers) {
      if (this.isCooling(provider)) continue;
      const text = await this.attempt(provider, request, {
        deadline,
        tries: ATTEMPTS_PER_PROVIDER,
      });
      if (text !== null) return { text, provider: provider.name };
    }
    return null;
  }

  private async attempt(
    provider: Provider,
    request: AiRequest,
    limits: Limits,
  ): Promise<string | null> {
    const remaining = limits.deadline - this.options.now();
    if (remaining < MIN_ATTEMPT_MS || !this.spendBudget()) return null;
    try {
      return await provider.generate(
        request,
        AbortSignal.timeout(Math.min(this.options.timeoutMs, remaining)),
      );
    } catch (error) {
      if (limits.tries > 1 && isBusy(error)) {
        await this.options.sleep(RETRY_PAUSE_MS);
        return this.attempt(provider, request, { ...limits, tries: limits.tries - 1 });
      }
      this.coolingUntil.set(provider.name, this.options.now() + cooldownFor(error));
      return null;
    }
  }

  private isCooling(provider: Provider): boolean {
    return (this.coolingUntil.get(provider.name) ?? 0) > this.options.now();
  }

  private spendBudget(): boolean {
    const today = dayOf(new Date(this.options.now()).toISOString());
    if (today !== this.budgetDay) {
      this.budgetDay = today;
      this.callsToday = 0;
    }
    if (this.callsToday >= this.options.dailyBudget) return false;
    this.callsToday += 1;
    return true;
  }
}

/** True for server-side overload (5xx), which usually clears within a second. */
function isBusy(error: unknown): boolean {
  return (statusOf(error) ?? 0) >= HTTP_STATUS.serverError;
}

/** How long to skip a provider after this failure. */
export function cooldownFor(error: unknown): number {
  const status = statusOf(error);
  if (status === HTTP_STATUS.tooManyRequests) {
    return error instanceof ProviderError && error.retryAfterMs !== null
      ? error.retryAfterMs
      : RATE_LIMIT_COOLDOWN_MS;
  }
  const clientError =
    status !== null && status >= HTTP_STATUS.clientError && status < HTTP_STATUS.serverError;
  if (clientError) return CONFIG_COOLDOWN_MS;
  return TRANSIENT_COOLDOWN_MS;
}
