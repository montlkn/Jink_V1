# Rollback Plan

## Triggers
- Crash-free sessions < 98.5%
- Scan p95 > 1.5s for 30m
- RLS misconfig impacts write paths

## Steps
1) Flip feature flags off (heavy shaders, semantic search)
2) Revert to previous app build on stores (phased)
3) Database rollback of last migration (if schema change)
4) Announce in-app banner if user-visible

## Postmortem
48h blameless write-up; action items with owners and due dates.
