# Security

## Reporting a vulnerability

Please report privately through
[GitHub security advisories](https://github.com/Harsha-code-per/BreatheWise/security/advisories/new),
not a public issue. You will get a reply within a week.

## Threat model and controls

| Threat                               | Control                                                                                                                                                                    | Where                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Cross-site scripting                 | A strict CSP with no inline script or style, `object-src 'none'` and Trusted Types. React escapes all output. No `innerHTML`, `eval` or `new Function` (zod runs jitless). | `vercel.json`, `src/main.tsx`, `tests/quality/hygiene.test.ts`    |
| Clickjacking and cross-origin leaks  | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP and CORP `same-origin`, plus a strict Referrer-Policy.                                                             | `vercel.json`                                                     |
| Cross-site request forgery and abuse | POST only, JSON only, an Origin and `Sec-Fetch-Site` check, a 16 KB body cap and per-IP sliding-window rate limits.                                                        | `api/_lib/handler.ts`, `api/_lib/rate-limit.ts`                   |
| Malformed input                      | Every request body and every upstream response is validated with zod, and coordinates and lengths are bounded.                                                             | `src/domain/schemas.ts`, `api/_lib/open-meteo.ts`                 |
| Prompt injection                     | User text goes inside `<question>` tags with angle brackets stripped. The system prompt tells the model to treat it only as a question. Output must match a schema.        | `api/_lib/ai/prompts.ts`                                          |
| AI inventing facts                   | The numbers guard rejects any text containing a number the engine did not compute. The server fetches the air data itself, so the browser cannot supply fake facts.        | `api/_lib/ai/prompts.ts`, `api/_lib/ai/service.ts`, `api/plan.ts` |
| Secret leakage                       | The Gemini key lives only in server environment variables and never reaches the browser bundle. A test scans the repo for key patterns. `.env*` files are git-ignored.     | `api/_lib/ai/config.ts`, `tests/quality/hygiene.test.ts`          |
| Quota exhaustion (denial of wallet)  | Response caching, request coalescing, a daily AI-call budget and per-model cooldowns. Once the budget is used, the engine's own wording is served.                         | `api/_lib/cache.ts`, `api/_lib/ai/cascade.ts`                     |
| Information disclosure               | Errors come from a fixed catalogue with safe messages. Server logs are fixed strings with no request data.                                                                 | `api/_lib/errors.ts`                                              |
| Vulnerable dependencies              | Only four runtime dependencies. Dependabot, CodeQL (security-and-quality) and `npm audit` run in CI, and actions are pinned to commit SHAs.                                | `.github/`                                                        |

## Privacy

- The family profile is stored in `localStorage` on the user's device. "Forget my family" deletes it.
- To write a plan, the profile is sent to our function and to Google Gemini. Neither stores it.
- Browser location is rounded to about 1 km before it leaves the device.
- There are no accounts, cookies, analytics or trackers.
