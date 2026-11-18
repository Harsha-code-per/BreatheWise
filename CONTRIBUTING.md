# Contributing

Thanks for helping families breathe cleaner air.

1. Fork the repository and create a branch from `main`.
2. Run `npm ci`, then `npm run dev`. Without a `GEMINI_API_KEY` the app uses its engine-written explanations.
3. Keep the house rules, which CI enforces:
   - **The engine owns numbers.** Any new figure is computed in `src/domain` with a cited source in `src/domain/sources.ts`, never by the AI.
   - **Domain code stays pure.** No React, network, clock or randomness (see `tests/quality/architecture.test.ts`).
   - **New API routes use `createHandler`** and a zod schema from `src/domain/schemas.ts`.
   - **Files stay under 200 lines** and functions under complexity 8.
   - **Tests keep coverage at 100%.** Add an e2e case for any new user journey.
4. Run `npm run check` and `npm run e2e` before opening a pull request.
5. Describe the change and how you tested it in the pull request.

By contributing you agree that your work is released under the MIT licence and that you will follow the
[code of conduct](CODE_OF_CONDUCT.md).
