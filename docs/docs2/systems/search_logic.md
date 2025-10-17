# Search Logic (Supabase + Semantic)

## Summary
Two-stage search: structured FTS over buildings and a semantic backfill via exa for ambiguous or descriptive queries.

## Query Types
- Direct: name, address, neighborhood → Supabase FTS first.
- Descriptive: style descriptors, era, materials → semantic pipeline.

## Orchestration
1) Parse query; if tokens match name/address fields, run FTS with weights (name 1.0, alt_names 0.8, neighborhood 0.6).
2) If low recall or descriptive query, call exa for semantic candidates; map to buildings by embedding nearest neighbors or metadata tags.
3) Merge, dedupe, rerank by distance, novelty, and archetype affinity.

## Output
List of candidates with reasons: matched_field or semantic_explanation, distance, novelty, and style match.

