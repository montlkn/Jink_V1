# Search Edge Functions

## Endpoints
- /search/buildings: q, lat, lng, limit. Returns ranked building list with match reasons.
- /search/autocomplete: q. Returns normalized suggestions for UI.
- /search/semantic: q. Returns semantic candidates (for diagnostics or fallback).

## Notes
- Enforce rate limits and cache hot queries.
- Prefer local FTS; call exa only when needed to control costs.

