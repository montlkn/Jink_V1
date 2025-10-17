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


# XP Core Mechanics (Updated)

## Summary
XP accumulates linearly but affects different unlock layers depending on user type. It is tracked transactionally and reflected visually through orb animations, profile level, and creative rights.

## XP Storage
- xp_transactions table: immutable event ledger.
- profiles.total_xp: rolling total for quick access.
- profiles.level: discrete progression marker.

## Level Thresholds
Level_n = 200 * n^1.5 (same curve for both Free and Pro).
Pro users gain expanded utility at each tier.

| Level | Free Unlock | Pro Unlock |
|-------|--------------|-------------|
| 1 | Scan + Passport | Orb customization |
| 2 | Personal dérive | Deep Dive Credit x1 |
| 3 | Style Quests | Custom derive route |
| 4 | Contribution rewards | Upload buildings |
| 5 | Aesthetic stats | Create public quests |
| 6 | Badge visualization | 3D orb modulation |
| 7+ | Stability tuning | Full creative suite |

