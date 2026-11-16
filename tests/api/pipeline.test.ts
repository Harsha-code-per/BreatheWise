import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { TtlCache } from '../../api/_lib/cache';
import { ApiError } from '../../api/_lib/errors';
import { createHandler, MAX_BODY_BYTES } from '../../api/_lib/handler';
import { clientKey, RateLimiter } from '../../api/_lib/rate-limit';
import { post } from './helpers';

const echo = createHandler({
  name: 'echo',
  input: z.object({ word: z.string().max(10) }),
  rate: { limit: 2, windowMs: 60_000 },
  run: async ({ word }) => {
    if (word === 'boom') throw new Error('secret detail');
    if (word === 'upstream') throw new ApiError('UPSTREAM_UNAVAILABLE');
    return Promise.resolve({ word });
  },
});

async function codeOf(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

describe('createHandler', () => {
  it('runs the route for a valid same-origin JSON request', async () => {
    const response = await echo(
      post('echo', { word: 'hi' }, { origin: 'https://breathewise.test' }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ word: 'hi' });
  });

  it.each([
    ['METHOD_NOT_ALLOWED', 405, new Request('https://breathewise.test/api/echo')],
    ['FORBIDDEN_ORIGIN', 403, post('echo', { word: 'hi' }, { origin: 'https://evil.example' })],
    ['FORBIDDEN_ORIGIN', 403, post('echo', { word: 'hi' }, { 'sec-fetch-site': 'cross-site' })],
    ['UNSUPPORTED_MEDIA_TYPE', 415, post('echo', { word: 'hi' }, { 'content-type': 'text/plain' })],
    [
      'PAYLOAD_TOO_LARGE',
      413,
      post('echo', { word: 'hi' }, { 'content-length': String(MAX_BODY_BYTES + 1) }),
    ],
    ['PAYLOAD_TOO_LARGE', 413, post('echo', 'x'.repeat(MAX_BODY_BYTES + 1))],
    ['BAD_JSON', 400, post('echo', '{not json')],
    [
      'BAD_JSON',
      400,
      new Request('https://breathewise.test/api/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-real-ip': '10.9.9.9' },
      }),
    ],
    ['INVALID_INPUT', 400, post('echo', { word: 'far too long a word' })],
    ['UPSTREAM_UNAVAILABLE', 502, post('echo', { word: 'upstream' })],
  ])('rejects with %s (%i)', async (code, status, request) => {
    const response = await echo(request);
    expect(response.status).toBe(status);
    expect(await codeOf(response)).toBe(code);
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await echo(post('echo', { word: 'boom' }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
    expect(log).toHaveBeenCalledWith('[api] echo failed unexpectedly');
  });

  it('rate limits per client and says when to retry', async () => {
    const request = () => post('echo', { word: 'hi' }, { 'x-real-ip': '192.0.2.1' });
    await echo(request());
    await echo(request());
    const limited = await echo(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
  });
});

describe('RateLimiter', () => {
  it('frees a slot once the window slides past the oldest request', () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    const rule = { limit: 1, windowMs: 1000 };
    expect(limiter.check('a', rule).allowed).toBe(true);
    now = 400;
    expect(limiter.check('a', rule)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    now = 1000;
    expect(limiter.check('a', rule).allowed).toBe(true);
  });

  it('forgets the oldest clients beyond its capacity', () => {
    const limiter = new RateLimiter(() => 0);
    const rule = { limit: 1, windowMs: 1000 };
    for (let client = 0; client <= 5000; client += 1) limiter.check(String(client), rule);
    expect(limiter.check('0', rule).allowed).toBe(true);
    expect(limiter.check('5000', rule).allowed).toBe(false);
  });

  it('identifies clients by x-real-ip, then x-forwarded-for', () => {
    const headers = (init: Record<string, string>) =>
      new Request('https://x.test', { headers: init });
    expect(clientKey(headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe(
      '1.1.1.1',
    );
    expect(clientKey(headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(clientKey(headers({ 'x-forwarded-for': '' }))).toBe('unknown');
    expect(clientKey(headers({}))).toBe('unknown');
  });
});

describe('TtlCache', () => {
  it('reuses values until they expire', async () => {
    let now = 0;
    const cache = new TtlCache<number>(10, () => now);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    expect(await cache.getOrLoad('k', 100, load)).toBe(1);
    expect(await cache.getOrLoad('k', 100, load)).toBe(1);
    now = 100;
    expect(await cache.getOrLoad('k', 100, load)).toBe(2);
  });

  it('shares one in-flight load between identical requests', async () => {
    const cache = new TtlCache<string>(10);
    const load = vi.fn(() => Promise.resolve('once'));
    const results = await Promise.all([
      cache.getOrLoad('k', 100, load),
      cache.getOrLoad('k', 100, load),
    ]);
    expect(results).toEqual(['once', 'once']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures and evicts the oldest entry when full', async () => {
    const cache = new TtlCache<string>(1);
    await expect(
      cache.getOrLoad('a', 100, () => Promise.reject(new Error('down'))),
    ).rejects.toThrow('down');
    expect(await cache.getOrLoad('a', 100, () => Promise.resolve('a'))).toBe('a');
    await cache.getOrLoad('b', 100, () => Promise.resolve('b'));
    expect(await cache.getOrLoad('a', 100, () => Promise.resolve('reloaded'))).toBe('reloaded');
  });
});
