import { describe, expect, it } from 'vitest';
import { filesIn, read } from './repo';

const source = [...filesIn('src', ['.ts', '.tsx']), ...filesIn('api', ['.ts'])];
const browser = filesIn('src', ['.ts', '.tsx']);
const tracked = [
  ...source,
  ...filesIn('tests', ['.ts', '.tsx']),
  ...filesIn('scripts', ['.ts', '.mjs']),
  'index.html',
  'vercel.json',
];

describe('repository hygiene', () => {
  it.each(source)('%s stays small and focused (at most 200 lines of code)', (path) => {
    // Counted like ESLint's max-lines rule: blank and comment-only lines are skipped.
    const code = read(path)
      .split('\n')
      .filter((line) => line.trim() !== '' && !/^\s*(\/\/|\/\*|\*)/.test(line));
    expect(code.length).toBeLessThanOrEqual(200);
  });

  it('contains no API keys or tokens', () => {
    const secret = /AIza[0-9A-Za-z_-]{30,}|gsk_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,}/;
    expect(tracked.filter((path) => secret.test(read(path)))).toEqual([]);
  });

  it('never escapes React or evaluates strings', () => {
    const unsafe = /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/;
    expect(source.filter((path) => unsafe.test(read(path)))).toEqual([]);
  });

  it('keeps the browser console clean', () => {
    expect(browser.filter((path) => read(path).includes('console.'))).toEqual([]);
  });

  it('logs only fixed messages on the server, never request data', () => {
    const calls = filesIn('api', ['.ts']).flatMap((path) => [
      ...read(path).matchAll(/console\.\w+\(([^)]*)\)/g),
    ]);
    const args = calls.map((call) => (call[1] ?? '').replace(/\$\{route\.name\}/g, ''));
    expect(args.length).toBeGreaterThan(0);
    expect(
      args.filter((arg) => /\$\{|\b(body|request|profile|question|error)\b/.test(arg)),
    ).toEqual([]);
  });

  it('leaves no unfinished work markers', () => {
    expect(source.filter((path) => /TODO|FIXME|XXX/.test(read(path)))).toEqual([]);
  });

  it('ships the documents a reviewer needs', () => {
    for (const doc of [
      'README.md',
      'SECURITY.md',
      'CONTRIBUTING.md',
      'LICENSE',
      '.env.example',
      'docs/ARCHITECTURE.md',
      'CODE_QUALITY.md',
      'EFFICIENCY.md',
      'TESTING.md',
      'ACCESSIBILITY.md',
      'PROBLEM_ALIGNMENT.md',
    ]) {
      expect(() => read(doc), doc).not.toThrow();
    }
  });
});
