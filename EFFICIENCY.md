# Efficiency

BreatheWise runs on free tiers (Vercel Hobby, the free Gemini key, Open-Meteo), so every request is designed to
cost as little as possible and to keep working when a quota runs out. Each figure below comes from the code or
from `npm run budget`.

## In the browser

| What              | How                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code splitting    | `src/app/App.tsx` lazy-loads the landing page and the dashboard, so each visitor downloads only the view they open.                                                                               |
| JavaScript budget | `scripts/bundle-budget.mjs` fails CI above 140 kB gzip in total or 80 kB per chunk. Today: 114.1 kB total (shared 71.0, dashboard 37.5, landing 4.7, units 0.9).                                  |
| Few dependencies  | Three runtime libraries in the browser: React, React DOM and zod. The hourly chart is CSS bars and the sky is one WebGL fragment shader, with no chart or 3D library.                             |
| Instant results   | The engine (`src/domain`) runs in the browser. `AirView.tsx` memoises the analysis, the engine briefing and the explanations, so the plan appears before the AI reply arrives.                    |
| Long-lived assets | `vercel.json` serves hashed `/assets/*` files with `Cache-Control: public, max-age=31536000, immutable`. The Geist font is self-hosted as subset `woff2` files, so there is no third-party fetch. |
| Animation cost    | The WebGL sky caps the pixel ratio at 1.5 (`sky-renderer.ts`). With `prefers-reduced-motion` it draws only when scrolling changes the haze (`SmogSky.tsx`), not every frame.                      |

## On the server

| What               | How                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caching            | `api/_lib/cache.ts` is a bounded TTL cache. Air forecasts are kept for 15 minutes and place searches for a day, both keyed per ~1 km grid cell (500 entries each). Place names are kept for a week (1,000 entries). AI briefings (300) and answers (500) are kept for 30 minutes. |
| Request coalescing | Identical requests that arrive while one is in flight share its upstream call, so a burst for one city makes one Open-Meteo or Gemini call.                                                                                                                                       |
| Bounded memory     | Every cache and the rate limiter (`api/_lib/rate-limit.ts`, at most 5,000 clients) evict the oldest entries, so memory cannot grow without limit.                                                                                                                                 |
| Timeouts           | Upstream calls stop after 6 s (`api/_lib/upstream.ts`). Each AI attempt stops after 9 s, and a whole AI cascade after 22 s (`api/_lib/ai/config.ts`).                                                                                                                             |
| Quota protection   | A model that returns 429 cools down for a minute, and one that fails or times out for 10 s (`api/_lib/ai/cascade.ts`). A daily budget (900 calls by default) caps AI use, and the engine's own wording takes over when it is spent.                                               |
| Small requests     | Request bodies are capped at 16 KB while streaming (`api/_lib/handler.ts`). Each route has its own per-IP rate limit, from 6 to 30 requests a minute.                                                                                                                             |
| Server-side facts  | `/api/plan` fetches the forecast itself and sends the AI only the engine's compact facts as JSON, not raw hourly data, which keeps prompts short.                                                                                                                                 |

## Verify

```bash
npm run build && npm run budget   # gzip size of every chunk against the budget
npm run e2e                       # the production build, served with the real headers
```
