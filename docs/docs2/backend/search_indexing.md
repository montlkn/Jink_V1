# Search Indexing (FTS + Vector Hybrid)

## Summary
Two-level index: fast text search via Postgres FTS; semantic fallback via pgvector. Exa candidates reconcile with local IDs.

## Indexes
- FTS: to_tsvector on buildings(name, alt_names, neighborhoods).
- Vector: pgvector 512-d for building embeddings.

## Query Orchestration
- Text first: if query has name/address tokens, run FTS weighted by field.
- If recall < k or query is descriptive, embed query via exa or local model; run vector search (cosine).
- Merge: union results by building_id; score = 0.6 * fts_score + 0.4 * cosine_sim; rerank by distance, novelty, archetype affinity.

## Refresh
- Recompute vectors on new photos or model upgrade; version vectors with model_id for reproducibility.

## Diagnostics
- Log per-query hit sources (fts, vector, both) to monitor costs and quality.

