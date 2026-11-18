# Code quality audit

Every rule below is an ESLint **error** in CI (`npm run lint`, zero warnings allowed), so the numbers
cannot drift. Measured on the 86 TypeScript files in `src/` and `api/`.

| Rule                  | Limit                                             | Today                                  |
| --------------------- | ------------------------------------------------- | -------------------------------------- |
| Function length       | ≤ 30 lines in logic (`.ts`), ≤ 50 in components   | 0 over                                 |
| Cyclomatic complexity | ≤ 8 per function                                  | highest is 8; 25 functions are above 4 |
| Nesting depth         | ≤ 3                                               | 0 over                                 |
| Parameters            | ≤ 3 per function                                  | 0 over                                 |
| File length           | ≤ 200 lines                                       | largest is 180 (`schemas.ts`)          |
| Magic numbers         | named constants in all logic (`no-magic-numbers`) | 0                                      |
| Types                 | `strictTypeChecked`, `tsc --strict`, no `any`     | 0 errors                               |
| Documentation         | JSDoc on every exported function                  | 0 missing                              |
| Unused code           | knip: no unused files, exports or dependencies    | 0                                      |
| Duplicated code       | jscpd, 40-token minimum                           | 0 clones                               |
| Accessibility in JSX  | `jsx-a11y` strict                                 | 0                                      |
| Layer boundaries      | `tests/quality/architecture.test.ts`              | engine imports no UI, network or clock |

## How the code is organised

- **One source of truth.** zod schemas define every data shape once; the TypeScript types are inferred from
  them and both the browser and the API validate with them. Field limits (`RANGES`), time units and
  rounding (`units.ts`), HTTP statuses (`HTTP_STATUS`) and display labels (`setup/labels.ts`) each live in
  one place.
- **Pure engine, thin edges.** `src/domain` computes every number with no network, clock or randomness.
  The API routes are 11 to 15 lines each because `api/_lib/handler.ts` runs the shared pipeline
  (method, origin, content type, size, rate limit, JSON, schema).
- **State in hooks, markup in components.** `useProfile`, `useSetupForm`, `useConversation`, `usePlan`,
  `useRemote` and the private hooks in `PlaceField`, `IntakeField`, `MembersField` and `Tabs` hold the
  behaviour; the components they serve only render.
- **Small interfaces.** AI models implement `Provider` (`name`, `generate`); the service depends on a
  `TextGenerator`; the cascade takes its clock and sleep as options. Tests inject fakes rather than
  mocking modules.

## Reproduce

```bash
npm run lint      # every rule in the table
npm run knip      # unused code
npm run coverage  # tests, including the architecture and hygiene checks
npx jscpd@4 --min-tokens 40 --ignore "**/*.css" src api scripts
```
