# 2. A cascade that survives free-tier rate limits

## Context

The project runs on free tiers only. The Gemini free tier rate limits per minute and per day, and a
hackathon demo can send bursts.

## Decision

Requests go cache, then Gemini models in order with per-model cooldowns (Retry-After aware), then an
optional OpenAI-compatible free provider, then the engine's own wording. A daily budget stops calls before
the quota runs out, and identical requests in flight share one call.

## Consequences

- The page never breaks or empties. When AI is unavailable the label says "Written by BreatheWise".
- Cooldowns and the budget are per server instance, which is enough at this scale; a shared store would be
  the next step.
