import { describe, expect, it } from 'vitest';
import { filesIn, importsOf, read } from './repo';

const domain = filesIn('src/domain', ['.ts']);
const browser = filesIn('src', ['.ts', '.tsx']);
const server = filesIn('api', ['.ts']);

describe('layer boundaries', () => {
  it.each(domain)('domain module %s is pure: no UI, network, clock or randomness', (path) => {
    const imports = importsOf(path);
    expect(imports.filter((name) => !name.startsWith('./') && name !== 'zod')).toEqual([]);
    expect(read(path)).not.toMatch(
      /\bfetch\(|Date\.now|new Date\(|Math\.random|localStorage|window\./,
    );
  });

  it('browser code never imports server code or Node built-ins', () => {
    const offenders = browser.filter((path) =>
      importsOf(path).some(
        (name) => name.includes('/api/') || name.startsWith('node:') || name === '@google/genai',
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('server code reuses the domain but never the UI', () => {
    const offenders = server.filter((path) =>
      importsOf(path).some(
        (name) => /src\/(dashboard|landing|setup|ui|lib|app)\//.test(name) || name === 'react',
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('every API route goes through the shared request pipeline', () => {
    const routes = server.filter((path) => !path.includes('_lib'));
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(read(route), route).toContain('createHandler(');
  });

  it('only the AI service talks to Gemini', () => {
    const users = server.filter((path) => importsOf(path).includes('@google/genai'));
    expect(users).toEqual(['api/_lib/ai/gemini.ts']);
  });
});
