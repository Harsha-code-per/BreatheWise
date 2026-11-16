import { describe, expect, it, vi } from 'vitest';
import { Cascade, cooldownFor } from '../../api/_lib/ai/cascade';
import { ProviderError, statusOf, type AiRequest, type Provider } from '../../api/_lib/ai/provider';

const request: AiRequest = { system: 's', prompt: 'p', schema: null, maxOutputTokens: 10 };

function provider(name: string, ...outcomes: (string | Error)[]): Provider & { calls: number } {
  const queue = [...outcomes];
  const self = {
    name,
    calls: 0,
    generate: () => {
      self.calls += 1;
      const next = queue.shift() ?? 'ok';
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
  };
  return self;
}

function cascade(providers: Provider[], clock = { now: 0 }, budget = 100) {
  return new Cascade(providers, {
    timeoutMs: 1000,
    totalMs: 5000,
    dailyBudget: budget,
    now: () => clock.now,
  });
}

describe('Cascade', () => {
  it('falls through to the next provider and cools down the failed one', async () => {
    const first = provider('first', new ProviderError(429, 5000), 'back');
    const second = provider('second', 'from second', 'again');
    const clock = { now: 0 };
    const chain = cascade([first, second], clock);
    expect(await chain.generate(request)).toEqual({ text: 'from second', provider: 'second' });
    expect(await chain.generate(request)).toEqual({ text: 'again', provider: 'second' });
    clock.now = 5000;
    expect(await chain.generate(request)).toEqual({ text: 'back', provider: 'first' });
  });

  it('returns null when every provider fails', async () => {
    expect(await cascade([provider('a', new Error('down'))]).generate(request)).toBeNull();
    expect(await cascade([]).generate(request)).toBeNull();
  });

  it('stops spending once the daily budget is used, and resets the next day', async () => {
    const only = provider('only');
    const clock = { now: 0 };
    const chain = cascade([only], clock, 1);
    expect(await chain.generate(request)).not.toBeNull();
    expect(await chain.generate(request)).toBeNull();
    clock.now = 86_400_000;
    expect(await chain.generate(request)).not.toBeNull();
    expect(only.calls).toBe(2);
  });

  it('gives up when too little time is left for another attempt', async () => {
    const clock = { now: 0 };
    const slow: Provider = {
      name: 'slow',
      generate: () => {
        clock.now += 4000;
        return Promise.reject(new ProviderError(503));
      },
    };
    const never = provider('never');
    expect(await cascade([slow, never], clock).generate(request)).toBeNull();
    expect(never.calls).toBe(0);
  });

  it('passes each provider an abort signal', async () => {
    const generate = vi.fn((_: AiRequest, signal: AbortSignal) =>
      Promise.resolve(String(signal.aborted)),
    );
    expect(await cascade([{ name: 'x', generate }]).generate(request)).toEqual({
      text: 'false',
      provider: 'x',
    });
  });
});

describe('cooldownFor', () => {
  it('honours Retry-After on 429 and picks sensible defaults', () => {
    expect(cooldownFor(new ProviderError(429, 7000))).toBe(7000);
    expect(cooldownFor(new ProviderError(429))).toBe(60_000);
    expect(cooldownFor({ status: 429 })).toBe(60_000);
    expect(cooldownFor(new ProviderError(404))).toBe(3_600_000);
    expect(cooldownFor(new ProviderError(503))).toBe(20_000);
    expect(cooldownFor(new Error('timeout'))).toBe(20_000);
  });

  it('reads statuses from different error shapes', () => {
    expect(statusOf({ status: 'nope' })).toBeNull();
    expect(statusOf(null)).toBeNull();
    expect(statusOf('x')).toBeNull();
  });
});
