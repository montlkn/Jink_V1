# XP System: Core Mechanics

## Summary
Defines the underlying rules of XP gain, persistence, and synchronization.

## XP Events
- Building scans
- Walk completions
- Quest completions
- Memory creations

## Storage
- Supabase `xp_transactions` (immutable ledger)
- `profiles.total_xp` and `profiles.level` for quick reads

## Sync
XP updates emitted as real-time events to refresh UI instantly.

> *Progress should always feel immediate.*
