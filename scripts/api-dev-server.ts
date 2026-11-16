/**
 * Local stand-in for Vercel: `vite dev` serves `api/<name>.ts` handlers, and `vite preview`
 * sends the production security headers from vercel.json so tests run under the real CSP.
 */
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin, type ViteDevServer } from 'vite';

interface Route {
  POST?: (request: Request) => Promise<Response>;
}

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

export function apiDevServer(): Plugin {
  return {
    name: 'breathewise-local-vercel',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api', (req, res, next) => {
        handle(server, req, res).catch(next);
      });
    },
    configurePreviewServer(server) {
      const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: HeaderRule[] };
      const headers = config.headers
        .filter((rule) => rule.source === '/(.*)')
        .flatMap((rule) => rule.headers);
      server.middlewares.use((_req, res, next) => {
        for (const header of headers) res.setHeader(header.key, header.value);
        next();
      });
    },
  };
}

async function handle(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const name = new URL(req.url ?? '/', 'http://localhost').pathname.slice(1);
  const route = /^[a-z-]+$/.test(name)
    ? ((await server.ssrLoadModule(`/api/${name}.ts`)) as Route)
    : {};
  if (!route.POST) {
    res.statusCode = 404;
    res.end();
    return;
  }
  const response = await route.POST(await toRequest(req, name));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function toRequest(req: IncomingMessage, name: string): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
  }
  const method = req.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD' ? null : Buffer.concat(chunks);
  return new Request(`http://${req.headers.host ?? 'localhost'}/api/${name}`, {
    method,
    headers,
    body,
  });
}
