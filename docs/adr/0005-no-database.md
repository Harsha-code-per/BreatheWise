# 5. No accounts and no database

## Context

A family's profile includes health conditions and where they live.

## Decision

- The profile is kept in `localStorage` only, validated on read, and removable with "Forget my family".
- Servers process each request and keep only short-lived caches of public forecasts and AI wording.

## Consequences

- There is no sign-up friction and no stored personal data to breach.
- Profiles do not sync across devices, which is acceptable for a daily-use assistant.
