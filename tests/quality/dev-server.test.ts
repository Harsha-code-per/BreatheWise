import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { apiDevServer } from '../../scripts/api-dev-server';

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;
type Hook = (server: unknown) => void;

function request(url: string, method = 'POST', body = ''): IncomingMessage {
  const chunks = body ? [Buffer.from(body)] : [];
  return Object.assign(Readable.from(chunks), {
    url,
    method,
    headers: { host: 'localhost:5173', 'content-type': 'application/json', 'x-list': ['a', 'b'] },
  }) as unknown as IncomingMessage;
}

function response() {
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: '' };
  return Object.assign(res, {
    setHeader: (key: string, value: string) => {
      res.headers[key] = value;
    },
    end: (data?: Buffer) => {
      res.body = data ? data.toString() : '';
    },
  });
}

function devMiddleware(load: (path: string) => Promise<unknown>): Middleware {
  const use = vi.fn();
  (apiDevServer().configureServer as Hook)({
    config: { mode: 'test' },
    middlewares: { use },
    ssrLoadModule: load,
  });
  return use.mock.calls[0]?.[1] as Middleware;
}

async function run(middleware: Middleware, req: IncomingMessage) {
  const res = response();
  const next = vi.fn();
  middleware(req, res as unknown as ServerResponse, next);
  await vi.waitFor(() => {
    expect(res.statusCode !== 0 || next.mock.calls.length > 0).toBe(true);
  });
  return { res, next };
}

describe('local Vercel stand-in', () => {
  it('runs api/<name>.ts handlers with the request body and copies the response', async () => {
    const POST = vi.fn(async (incoming: Request) =>
      Response.json(
        { echo: (await incoming.json()) as unknown },
        { status: 201, headers: { 'x-test': 'yes' } },
      ),
    );
    const load = vi.fn(() => Promise.resolve({ POST }));
    const { res } = await run(devMiddleware(load), request('/air?x=1', 'POST', '{"a":1}'));
    expect(load).toHaveBeenCalledWith('/api/air.ts');
    expect(res.statusCode).toBe(201);
    expect(res.headers['x-test']).toBe('yes');
    expect(JSON.parse(res.body)).toEqual({ echo: { a: 1 } });
    expect(POST.mock.calls[0]?.[0].headers.get('x-list')).toBeNull();
  });

  it('answers 404 for unknown or malformed routes and passes GET requests without a body', async () => {
    const load = vi.fn(() => Promise.resolve({}));
    expect((await run(devMiddleware(load), request('/air.ts'))).res.statusCode).toBe(404);
    expect(load).not.toHaveBeenCalled();
    expect((await run(devMiddleware(load), request('/nothing', 'GET'))).res.statusCode).toBe(404);
    const POST = vi.fn((incoming: Request) => Promise.resolve(new Response(incoming.method)));
    const got = await run(
      devMiddleware(() => Promise.resolve({ POST })),
      request('/air', 'GET'),
    );
    expect(got.res.body).toBe('GET');
  });

  it('loads .env files outside tests, from the project folder only', () => {
    vi.stubEnv('VITEST', '');
    vi.spyOn(process, 'cwd').mockReturnValue(mkdtempSync(join(tmpdir(), 'bw-env-')));
    expect(devMiddleware(() => Promise.resolve({}))).toBeTypeOf('function');
    vi.unstubAllEnvs();
  });

  it('copes with requests that lack a URL, method or host', async () => {
    const POST = vi.fn((incoming: Request) =>
      Promise.resolve(new Response(new URL(incoming.url).host)),
    );
    const bare = Object.assign(Readable.from([]), { headers: {} }) as unknown as IncomingMessage;
    expect(
      (
        await run(
          devMiddleware(() => Promise.resolve({ POST })),
          bare,
        )
      ).res.statusCode,
    ).toBe(404);
    const noHost = Object.assign(Readable.from([]), {
      url: '/air',
      headers: {},
    }) as unknown as IncomingMessage;
    const { res } = await run(
      devMiddleware(() => Promise.resolve({ POST })),
      noHost,
    );
    expect(res.body).toBe('localhost');
    expect(POST.mock.calls[0]?.[0].method).toBe('GET');
  });

  it('hands loader failures to the next middleware', async () => {
    const failure = new Error('broken module');
    const { next } = await run(
      devMiddleware(() => Promise.reject(failure)),
      request('/air'),
    );
    expect(next).toHaveBeenCalledWith(failure);
  });

  it('applies the production security headers to vite preview', () => {
    const use = vi.fn();
    (apiDevServer().configurePreviewServer as Hook)({ middlewares: { use } });
    const res = response();
    const next = vi.fn();
    (use.mock.calls[0]?.[0] as Middleware)(
      {} as IncomingMessage,
      res as unknown as ServerResponse,
      next,
    );
    expect(res.headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(next).toHaveBeenCalled();
  });
});
