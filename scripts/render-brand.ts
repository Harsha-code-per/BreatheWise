/**
 * Renders the PNG icons and the social preview image from public/favicon.svg.
 * Run with `npx tsx scripts/render-brand.ts` after changing the mark; the outputs are committed.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const mark = readFileSync('public/favicon.svg', 'utf8');
const icons: [string, number][] = [
  ['public/favicon-32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
];

const preview = `
<body style="margin:0;width:1200px;height:630px;display:grid;align-content:center;gap:28px;padding:0 96px;box-sizing:border-box;
  background:radial-gradient(circle at 78% 30%, #f3d9a455, transparent 34%), linear-gradient(#0e1626, #1d2f57);
  color:#e8eef6;font-family:'Geist','Inter',system-ui,sans-serif">
  <div style="display:flex;align-items:center;gap:20px;font-size:40px;font-weight:560">
    <div style="width:72px;height:72px">${mark}</div>BreatheWise
  </div>
  <div style="font-size:132px;font-weight:260;letter-spacing:-0.05em;line-height:0.95">Clear the air.</div>
  <div style="font-size:34px;color:#a9b6c9;max-width:900px">Smog has a schedule. Plan your family’s day around it.</div>
</body>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [path, size] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">${mark.replace('<svg ', `<svg width="${String(size)}" height="${String(size)}" `)}</body>`,
  );
  await page.screenshot({ path, omitBackground: true });
}
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(preview);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
