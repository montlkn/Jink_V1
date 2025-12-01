# XP

## Purpose

XP is the single connective currency. It measures exploration, powers unlocks
for Free users, and powers creative entitlements for Pro users. It is
append-only and transactional.

## Ledger & Leveling

- `xp_transactions`: immutable ledger of events. `profiles.total_xp` is a cached
  read optimized field.
- Level formula: `XP_required(level) = base * level^1.5`. Use
  `calculate_level(total_xp)` helper.
- Idempotency: clients send `event_uuid`. Server ignores duplicate `event_uuid`.

## Earning (core)

- **Scan new building**: ~25 XP (first-time). Repeat scans yield reduced XP.
- **Dérive / Walk complete**: 10 XP per stop + 5 XP per minute walking + 10 XP
  for completion of walk (proportional to stops/length). If walk garners
  achievement, visa, or specific stamps upon completion of walk those XP's are
  added on top of the base XP formula plus an additonal 10 XP is given for a
  multi-award walk.
  - **Time-based duration multipliers** (applied to total walk XP):
    - **1.0x** (no bonus): 0-5 min, 80-85 min
    - **1.2x**: 5-10 min, 35-45 min, 75-80 min
    - **1.5x**: 10-20 min, 45-55 min, 65-75 min
    - **2.0x**: 20-35 min, 55-65 min, 85-90 min
- **Daily quest**: 250 XP (+50 early-bird).
- **Weekly quest**: 1000 XP (+200 perfect week).
- **Streaks**: daily streak multipliers for consistent engagement. See
  [streaks.md](./streaks.md) for full mechanics.
  - 3-day streak → 1.5x XP multiplier
  - 7-day streak → 2x XP multiplier
  - 30-day streak → 3x XP multiplier + "Dedicated Explorer" achievement
- **Social / contribution**: referral or verified contribution bonuses.

## Free vs Pro (summary)

- **Free**: XP gates feature depth and access to richer writeups. Free users can
  spend XP to unlock individual writeups or temporary features; spending below a
  level threshold removes those level gates (feature decay). Daily streaks are
  key progression for Free users.
- **Pro**: No feature decay. Pro gets creative entitlements, unlimited scans (or
  higher limits), XP multipliers (e.g., 1.2–2x configurable), and Deep Dive
  Credits (1 credit per 1000 XP).

## Sinks (no skins shop)

- Remove skins/shop as an XP sink.
- XP sinks:
  - Unlocking Free-tier writeups or temporary deeper content (spend-to-unlock).
  - Creating or publishing content (Free creators pay XP as gating + limited
    rate per week of creating).
  - Deep Dive Credits conversion (Pro: 1 credit per 1000 XP).
- Policy: XP should not be directly purchasable with money. Keep XP a
  work-for-reward currency.

## Award pattern

- `award_xp(user_id, amount, reason, source_type, source_id, event_uuid)`:
  - Insert `xp_transactions` (idempotent).
  - Update `profiles.total_xp`.
  - Recompute level via `calculate_level`.
  - Emit `event_xp_awarded` and `event_level_up` if level increased.

## Anti-grind

- Cap events: `10 events / minute` and reduced XP on duplicate scans.
- Monitor abnormal issuance and be ready to hold or revoke suspicious grants.
