# Architecture

BreatheWise has three layers. Dependencies point inwards only, and `tests/quality/architecture.test.ts` enforces that.

```
┌──────────────── Browser (src/) ────────────────┐      ┌────────── Vercel Functions (api/) ──────────┐
│ landing/   WebGL "Clear the air" story         │      │ air places locate intake plan ask            │
│ setup/     family profile form                 │ JSON │   └─ _lib/handler.ts  one request pipeline   │
│ dashboard/ now panel, briefing, tabs, Ask      │◀────▶│ _lib/open-meteo.ts  forecast + cache         │
│ lib/       typed API client, storage, hooks    │      │ _lib/ai/  cascade, providers, prompts, guard │
└──────────────────────┬─────────────────────────┘      └─────────────────────┬────────────────────────┘
                       └──────────── src/domain/ (pure engine, shared) ───────┘
```

## Domain engine (`src/domain`)

`analyse(profile, air)` is the single entry point and the same code runs in the browser and on the server.

| Module                                                 | Responsibility                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `schemas.ts`                                           | zod contracts for profiles, forecasts, briefings and API bodies; types are derived from them |
| `aqi.ts`                                               | EPA AQI bands and guidance                                                                   |
| `smog.ts`                                              | inversion detection (boundary layer < 300 m), smog hours, daily outlook                      |
| `windows.ts`                                           | cleanest and dirtiest runs of hours (sliding-window mean)                                    |
| `exposure.ts`                                          | dose = concentration × time × breathing rate; cigarette equivalence                          |
| `indoor.ts`                                            | single-room mass balance, purifier sizing                                                    |
| `commute.ts`                                           | CO₂, time and dose for each way of commuting                                                 |
| `context.ts`                                           | which day and hours to plan; shared figures                                                  |
| `routine.ts`, `home.ts`, `switches.ts`, `community.ts` | the four kinds of action, each with quantified impact                                        |
| `analysis.ts`                                          | assembles everything and totals the impact                                                   |
| `briefing.ts`, `answer.ts`                             | the engine's own wording when no AI is available                                             |
| `sources.ts`                                           | citations for every constant                                                                 |

The engine never reads the clock: "now" comes from the forecast's local time, so results are reproducible and
time-zone safe.

## Request pipeline (`api/_lib/handler.ts`)

Checks run in this order, and each has its own entry in the error catalogue:

1. Method (405)
2. Same-origin (403)
3. JSON content type (415)
4. Size cap (413)
5. Rate limit (429 with `Retry-After`)
6. JSON parse (400)
7. Schema validation (400)
8. The route's own logic

Unexpected errors become a generic 500 with a fixed log line.

## AI cascade (`api/_lib/ai`)

`service.ts` → cache (30 min, coalesced) → `cascade.ts` → providers in order (`gemini.ts` per model, then the
optional `openai-compatible.ts`). Each provider gets its own timeout, and the whole cascade has a total time
limit inside the 30 s function budget.

A failure puts that provider on cooldown:

- **429:** for the `Retry-After` time, or 60 s if none is given.
- **Server error or timeout:** 20 s.
- **400, 401, 403 or 404:** 1 h, since these mean bad configuration.

A daily call budget caps usage.

Results must parse against `briefingSchema` and pass `grounded()` (the numbers guard). Otherwise the engine's
wording is returned with `source: "engine"`.

## Front end

- **Bundles.** React 19 with two lazy routes (`/` and `/app`) on the History API, with View Transitions between them.
- **Sky.** The landing sky is one hand-written fragment shader. Scroll position drives a `--clarity` variable and
  never re-renders React. Without WebGL a CSS gradient stands in.
- **Data loading.** The dashboard computes the analysis locally the moment the forecast arrives. The AI briefing
  loads in parallel and replaces the engine's wording when it is ready.
