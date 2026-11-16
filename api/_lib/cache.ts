/**
 * Small time-to-live cache with request coalescing. Identical requests share one upstream
 * call while it is in flight, and its result for the TTL afterwards, which keeps free-tier
 * quotas (Open-Meteo, Gemini) far from their limits.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

/** A bounded TTL cache. Map insertion order makes the first key the oldest to evict. */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly pending = new Map<string, Promise<V>>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(maxEntries: number, now: () => number = Date.now) {
    this.maxEntries = maxEntries;
    this.now = now;
  }

  /** Returns a fresh cached value or loads, stores and returns a new one. Failures are not cached. */
  async getOrLoad(key: string, ttlMs: number, load: () => Promise<V>): Promise<V> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const loading = load().then((value) => {
      this.store(key, value, ttlMs);
      return value;
    });
    this.pending.set(key, loading);
    try {
      return await loading;
    } finally {
      this.pending.delete(key);
    }
  }

  private store(key: string, value: V, ttlMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    const oldest = this.entries.keys().next();
    if (this.entries.size > this.maxEntries && !oldest.done) this.entries.delete(oldest.value);
  }
}
