# Cost Controls (AI + Vector + Egress)

## AI
- Exa/LLM calls gated behind feature flags; batched for nightly enrichment.
- Per-user monthly ceiling, per-session ceiling; degrade to cached summaries.

## Vector
- Batch re-embeds at off-peak; ivfflat lists=100; cap k=20 on searches.

## Maps/Tile Egress
- Tile cache (512 squarish) with 7d TTL; limit high-zoom fetching.

## Alerts
- Budgets per service; Slack alert at 70/90/100%.
