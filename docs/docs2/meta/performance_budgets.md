# Performance Budgets

## App
- Cold start: ≤ 2.5s (dev), ≤ 1.5s (release)
- First interactive: ≤ 1.2s after splash
- Memory steady-state: ≤ 300 MB typical

## Camera/Scan
- Preview FPS: ≥ 28 on mid devices
- Scan p95: ≤ 900 ms, timeout 2.5s with graceful UI
- GC spikes: < 8 ms during capture

## Map/Derive
- Map interaction latency: < 16 ms
- Route generation p95: ≤ 1.2s

## Rendering
- One live shader scene at a time
- Avoid more than 2 concurrent animated props per node
