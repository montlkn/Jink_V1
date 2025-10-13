# Analytics Events and Telemetry

## Summary
Minimal, privacy-respecting events to measure product health and guide tuning.

## Event Schema (fields)
- event_name, user_id (hashed), ts_iso, context (screen, city), payload_json.

## Core Events
- scan_start, scan_success, scan_fail
- derive_start, derive_finish
- quest_accept, quest_complete
- contribution_submit, contribution_verified
- xp_gain (with reason), level_up
- subscription_activate, subscription_cancel
- error (error_code, recoverable, retry_count)

## KPIs
- Scan success rate p95 time
- First week retention
- Avg stamps per active user
- Derive start→finish conversion
- Contribution verification rate

## Privacy
- No precise addresses; round lat/lon or bucket by tiling.
- Honoring OS-level analytics opt-out.

