# Search Relevance Evaluation Plan

## Metrics
- NDCG@5, Recall@10 on a labeled set of 300 queries
- Click-through rate on top suggestion
- Time-to-first-correct (TTFC)

## Offline Set
- 200 direct-name queries (exact + fuzzy)
- 100 descriptive queries (e.g., “brick art deco corner tower”)

## Experiment Toggles
- fts_weight_name, fts_weight_alt, vec_weight, distance_decay
- exa_backfill_threshold

## Procedure
- Nightly job: run fixed query set; log metrics
- Weekly auto-report; flag regressions > 5%
