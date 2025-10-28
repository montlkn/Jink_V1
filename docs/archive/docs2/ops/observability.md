# Observability (Logs, Metrics, Traces)

## Client
- Sentry: crashes, breadcrumbs, release tags
- Custom: scan timings, derive timings, GPU fallback events

## Edge
- Structured logs (json): request_id, endpoint, latency_ms, err
- Metrics: p50/p95 latency, RPS, error rate
- Traces: scan pipeline spans: prefilter → clip → write

## Dashboards
- Red routes: scan, derive, search
- Error budget burn-down per endpoint
