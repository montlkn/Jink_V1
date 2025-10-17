# Data Sync (Offline Queue)

## Summary
Queue user actions while offline, replay when back online, and resolve conflicts deterministically.

## Queue
- actions_queue: local device queue with type, payload, created_at.
- Replay order: chronological; dedupe by client_nonce.

## Conflicts
- Duplicate scans within a cooldown window are merged.
- Clash on stamp issuance resolves to first-seen.

## Telemetry
- Emit sync_completed with counts for observability.

