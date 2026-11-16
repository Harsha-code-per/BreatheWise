/**
 * Tries providers in order until one answers. A provider that is rate limited, failing or
 * slow is put on cooldown so later requests skip it, and a daily budget keeps usage inside
 * free-tier quotas. When everything is exhausted it returns null and callers use the engine.
 */
import { ProviderError, statusOf, type AiRequest, type Provider } from './provider.js';

/** Cooldown after a 429 without a Retry-After header. */
const RATE_LIMIT_COOLDOWN_MS = 60_000;
/** Cooldown after a server error, timeout or network failure. */
const TRANSIENT_COOLDOWN_MS = 20_000;
/** Cooldown when the request itself is rejected (bad key or unknown model), which will not heal soon. */
const CONFIG_COOLDOWN_MS = 60 * 60_000;

/** Tuning for one cascade: per-provider timeout, total time for a request, and calls per day. */
export interface CascadeOptions {
  timeoutMs: number;
  totalMs: number;
  dailyBudget: number;
  now?: () => number;
}

/** A provider is not worth starting with less time than this left. */
const MIN_ATTEMPT_MS = 2000;

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
    this.options = { now: Date.now, ...options };
  }

  /** Generates text with the first available provider, or returns null if none can answer. */
  async generate(request: AiRequest): Promise<CascadeResult | null> {
    const deadline = this.options.now() + this.options.totalMs;
    for (const provider of this.providers) {
      const remaining = deadline - this.options.now();
      if (remaining < MIN_ATTEMPT_MS) break;
      if (this.isCooling(provider) || !this.spendBudget()) continue;
      try {
        const signal = AbortSignal.timeout(Math.min(this.options.timeoutMs, remaining));
        const text = await provider.generate(request, signal);
        return { text, provider: provider.name };
      } catch (error) {
        this.coolingUntil.set(provider.name, this.options.now() + cooldownFor(error));
      }
    }
    return null;
  }

  private isCooling(provider: Provider): boolean {
    return (this.coolingUntil.get(provider.name) ?? 0) > this.options.now();
  }

  private spendBudget(): boolean {
    const today = new Date(this.options.now()).toISOString().slice(0, 10);
    if (today !== this.budgetDay) {
      this.budgetDay = today;
      this.callsToday = 0;
    }
    if (this.callsToday >= this.options.dailyBudget) return false;
    this.callsToday += 1;
    return true;
  }
}

/** How long to skip a provider after this failure. */
export function cooldownFor(error: unknown): number {
  const status = statusOf(error);
  if (status === 429) {
    return error instanceof ProviderError && error.retryAfterMs !== null
      ? error.retryAfterMs
      : RATE_LIMIT_COOLDOWN_MS;
  }
  if (status !== null && status >= 400 && status < 500) return CONFIG_COOLDOWN_MS;
  return TRANSIENT_COOLDOWN_MS;
}
