# 1. The engine owns the numbers; the AI owns the words

## Context

Families act on what we tell them: when to go out, whether to buy a purifier. Language models write well but
can state wrong numbers with confidence.

## Decision

- Every figure (AQI band, clean windows, exposure cut, cigarettes-equivalent, CO₂) comes from pure, tested
  functions in `src/domain`.
- Gemini receives those facts as JSON and may only explain them.
- Before display, `grounded()` rejects AI text that contains any number missing from the facts.

## Consequences

- Advice is reproducible and testable, and the app still works without AI.
- AI output is narrower (no free estimates), which is the point.
