# Rate Limits (v1)

## Policy
- Identify users by auth uid and coarse IP hash.
- Return 429 with Retry-After; never hard drop.

## Limits
| Endpoint | Free | Pro | Window |
|----------|------|-----|--------|
| /scan/identify | 30/min | 60/min | 60s |
| /search/buildings | 60/min | 120/min | 60s |
| /quests/generate | 10/day | 30/day | 24h |
| /contributions/submit | 3/hour | 6/hour | 60m |

## Implementation
- Edge middleware counter (Redis or Postgres advisory locks)
- Token bucket with leaky refill; attach headers: X-RateLimit-*
