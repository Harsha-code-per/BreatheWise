# 3. The server fetches the air data the AI explains

## Context

If the browser sent the forecast to `/api/plan`, anyone could make the AI "explain" fake pollution figures.

## Decision

`/api/plan` and `/api/ask` accept only the family profile. The function fetches the forecast itself
(cached per ~1 km cell) and runs the engine server-side before prompting.

## Consequences

- The AI only ever sees real forecast data.
- The forecast is fetched twice per visit (once for the dashboard, once for the plan), but the shared cache
  makes the second fetch nearly free.
