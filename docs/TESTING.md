# Testing

| Layer      | Tool                              | What it covers                                                                                                                                                                                                                            |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain     | Vitest + fast-check               | Every engine module, hand-computed expected values from a realistic smog-day fixture, and property tests (for example, ranked windows are always cleanest first).                                                                         |
| API        | Vitest                            | The request pipeline (each rejection path), rate limiter, TTL cache and coalescing, Open-Meteo parsing and failures, the cascade (cooldowns, budget, deadline), both providers, prompts, the numbers guard, the service, and every route. |
| UI         | Testing Library + axe-core        | The full family journey: setup, forecast, tabs with the keyboard, AI and engine briefings, Ask, sharing, retry, edit and forget. Also the WebGL renderer (with a fake context), the scroll hook, and accessibility.                       |
| Quality    | Vitest                            | Repository hygiene (file size, no secrets, no unsafe DOM APIs, fixed log messages, required docs) and architecture boundaries.                                                                                                            |
| End to end | Playwright + @axe-core/playwright | The production build served with the real `vercel.json` headers, on desktop and mobile, in light and dark themes. Fails on any console error, including CSP and Trusted Types violations.                                                 |

Coverage thresholds are **100%** for statements, branches, functions and lines (`vite.config.ts`). Only `src/main.tsx`,
the three-line bootstrap, is excluded.

```bash
npm test            # unit, UI and quality tests
npm run coverage    # with the 100% gate
npm run e2e         # Playwright (runs `npm run build` first)
```

Tests never call the network. Open-Meteo and the AI are replaced with fixtures at the `fetch` and provider seams.
