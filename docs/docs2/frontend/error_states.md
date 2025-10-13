# Error States and Failure Handling

## Summary
Defines user-facing states and recovery paths for camera scans, GPS, network, and backend failures. The goal is graceful degradation: never a dead-end, always a suggestion.

## Error Taxonomy
- CAMERA_PERMISSION_DENIED: user blocked camera access.
- LOCATION_PERMISSION_DENIED: user blocked location access.
- LOW_GPS_ACCURACY: HDOP too high or no recent fix.
- SCAN_CONFIDENCE_LOW: CLIP match below threshold.
- NETWORK_OFFLINE: no connectivity.
- EDGE_TIMEOUT: /scan/identify or other RPC exceeds SLA.
- RLS_FORBIDDEN: Supabase row-level security denial.
- SUBSCRIPTION_REQUIRED: action gated behind Pro.

## UI Patterns
- Inline, non-blocking banners with a single action.
- Persistent retry affordance on scan result card.
- Soft haptics for recoverable errors, none for fatal.

## Recovery Flows
- CAMERA_PERMISSION_DENIED: present OS prompt link and a “Try demo mode” option that uses gallery images with geofenced samples.
- LOCATION_PERMISSION_DENIED: show “Proceed without location” which narrows search by visual similarity only; lowers confidence threshold visibly in UI.
- LOW_GPS_ACCURACY: show “Move a few steps or hold steady” tip; postpone calling /scan/identify for up to 3 seconds to stabilize.
- SCAN_CONFIDENCE_LOW: ask user to confirm from top-3 candidates; confidence accepted becomes user_verified flag for model tuning.
- NETWORK_OFFLINE: queue scan event locally; show an offline badge and “Will sync later.”
- EDGE_TIMEOUT: offer retry with backoff; show time remaining dots to avoid perceived freeze.
- RLS_FORBIDDEN: refresh auth token; if persists, sign-out fallback with state backup.
- SUBSCRIPTION_REQUIRED: show Pro explainer sheet with clear benefit mapping, not a hard wall.

## Telemetry
- Log error_code, context (screen, action), retry_count, user_action (retry, cancel). Use this to prune noisy states.

## SLA Targets
- /scan/identify p95 under 900 ms.
- Route/derive p95 under 1200 ms.
- Search/autocomplete p95 under 200 ms.

