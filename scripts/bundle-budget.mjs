// Fails the build when shipped JavaScript grows past its budget (gzip sizes).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ASSETS = 'dist/assets';
const BUDGET_KB = { total: 140, chunk: 80 };

const chunks = readdirSync(ASSETS)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, kb: gzipSync(readFileSync(join(ASSETS, name))).length / 1024 }));
const total = chunks.reduce((sum, chunk) => sum + chunk.kb, 0);

for (const chunk of chunks) console.log(`${chunk.kb.toFixed(1).padStart(6)} kB  ${chunk.name}`);
console.log(`${total.toFixed(1).padStart(6)} kB  total (budget ${BUDGET_KB.total} kB)`);

const oversized = chunks.filter((chunk) => chunk.kb > BUDGET_KB.chunk);
if (total > BUDGET_KB.total || oversized.length > 0) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
