# Requirement traceability

Each phrase of the challenge maps to the code that implements it and the tests that prove it.

| Requirement                              | Engine (`src/domain`)                                                                          | Interface                                                                           | Tests                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Helps **families**                       | `action.ts` (`isSensitive`), `routine.ts` (shelter for sensitive members)                      | `setup/MembersField.tsx`, `dashboard/NowPanel.tsx`                                  | `tests/domain/routine.test.ts`, `tests/ui/setup.test.tsx`       |
| Helps **communities**                    | `community.ts` (no-burning pledge, walking school bus, shared filters, carpool)                | `dashboard/SharePlan.tsx`                                                           | `tests/domain/footprint.test.ts`, `tests/ui/dashboard.test.tsx` |
| Navigate **severe winter smog**          | `smog.ts` (inversion + PM2.5 ≥ 55.5 µg/m³), `aqi.ts`                                           | `NowPanel.tsx` alert, `HourlyChart.tsx` striped inversion hours                     | `tests/domain/windows.test.ts`                                  |
| **Urban air pollution** data             | live CAMS forecast (`api/_lib/open-meteo.ts`)                                                  | outlook strip, hourly chart and table                                               | `tests/api/open-meteo.test.ts`                                  |
| **Low-emission daily routines**          | `windows.ts`, `routine.ts` (exercise, airing, commute shift, windows shut)                     | Today tab                                                                           | `tests/domain/routine.test.ts`                                  |
| **Indoor air quality hacks**             | `indoor.ts` (mass balance), `home.ts` (purifier or DIY box, cooking, incense, mopping, plants) | At home tab                                                                         | `tests/domain/home.test.ts`, `tests/domain/basics.test.ts`      |
| **Sustainable alternatives**             | `commute.ts`, `switches.ts` (commute and heating swaps)                                        | Greener choices tab                                                                 | `tests/domain/footprint.test.ts`                                |
| Tailored to **location**                 | `context.ts` (local day and hour)                                                              | `setup/PlaceField.tsx` (search or rounded geolocation)                              | `tests/ui/setup.test.tsx`                                       |
| Tailored to **lifestyle**                | `schemas.ts` profile: commute, home, fuel, heating, exercise                                   | `setup/LifestyleFields.tsx`                                                         | `tests/ui/setup.test.tsx`                                       |
| **Clearly explaining the direct impact** | `exposure.ts` (dose, cigarettes), `analysis.ts` totals, `sources.ts`                           | impact labels (`lib/format.ts`), "How we calculate" (`Method.tsx`)                  | `tests/ui/lib.test.tsx`, `tests/domain/analysis.test.ts`        |
| **GenAI-powered**                        | facts serialised in `api/_lib/ai/prompts.ts`                                                   | briefing (`BriefingCard.tsx`), explanations, Ask (`AskPanel.tsx`) in five languages | `tests/api/service.test.ts`, `tests/api/providers.test.ts`      |

## GenAI services

- **Google Gemini** through `@google/genai`, with the model chain in `GEMINI_MODELS`.
  - `/api/plan` returns structured JSON that matches `briefingSchema` (via `responseJsonSchema`).
  - `/api/ask` answers in grounded free text.
- **Optional:** any OpenAI-compatible free tier through `FALLBACK_AI_*`, used only when every Gemini model is
  cooling down.
- **Guards** in `api/_lib/ai`:
  - schema validation
  - the numbers guard (`grounded`)
  - prompt-injection fencing
  - a cache with coalescing
  - per-model cooldowns
  - a daily budget
  - a deterministic fallback in `src/domain/briefing.ts` and `src/domain/answer.ts`
