# Backend: AI Services

## Summary
Queue-based enrichment to keep UX snappy.

## Flow
On first scan of a building by any user, enqueue a semantic summary job. Store results in building metadata for reuse.

## Guardrails
Rate limiting, content safety, and caching. Record provenance and model version.
