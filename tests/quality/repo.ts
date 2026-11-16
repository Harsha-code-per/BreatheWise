import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');

/** Every file under a folder whose name ends with one of the extensions, as repo-relative paths. */
export function filesIn(folder: string, extensions: readonly string[]): string[] {
  const start = join(ROOT, folder);
  if (!existsSync(start)) return [];
  return readdirSync(start, { recursive: true, encoding: 'utf8' })
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .map((path) => relative(ROOT, join(start, path)));
}

/** File contents by repo-relative path. */
export function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

/** Module specifiers imported by a source file. */
export function importsOf(path: string): string[] {
  return [...read(path).matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)].map((match) => match[1] ?? '');
}
