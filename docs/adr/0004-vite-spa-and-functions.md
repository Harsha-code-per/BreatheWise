# 4. A Vite single-page app with Vercel Functions

## Context

The app needs a cinematic landing page, an interactive dashboard and four small JSON endpoints, all on a free
host.

## Decision

- React 19 and Vite, with two lazy routes.
- Web-standard `Request → Response` handlers in `api/`, deployed as Vercel Functions.
- A small Vite plugin serves the same handlers in development and applies the production headers in preview.

## Consequences

- No framework server and a small bundle: about 110 kB of JS gzipped in total, with a 4.5 kB landing chunk.
- Handlers are plain functions, so tests call them directly with `Request` objects.
