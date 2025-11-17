# STAMPS

## Purpose
Stamps are durable, collectible tokens that record discovery and craft identity. They are mostly aesthetic. They support collection goals and unlock collection bonuses. Quest variants create FOMO.

## Types
- **Building Stamps (Common)**  
  - Awarded on first-time building scan. Cosmetic. Tied to base XP for scan.
- **Quest Stamps (Rare)**  
  - Awarded for completing quests. Gold-bordered. Show issuance rank and date. Missable.
- **Temporal Quest Stamps (Epic)**  
  - Issued when an temporal/rare quest is completed. Signal milestone.
- **Legendary Stamps (Legendary)**  
  - Tied to leaderboards. Very rare.

## Data model
- `stamps_def`: `id, slug, title, rarity, artwork, series, is_quest_variant, metadata`
- `user_stamps`: `id, user_id, stamp_id, issued_at, source_type, source_id, serial_number, metadata`

Keep `user_stamps` normalized for counting, analytics, and anti-abuse.

## Rules
- Grant once per `(user, stamp_id)`. Enforce uniqueness or upsert guard.
- Quest variants are limited-time and missable.
- Issue metadata includes serial number, rarity, and series.
- Collection bonuses are entitlements on the profile (e.g., complete NYC page → +5000 XP; 10 legendary stamps → permanent 1.5x XP multiplier).

## UX
- Passport pages: local, international, quest-exclusive, legendary.
- Show progress to collection completion and serial for rare stamps.
- Award animation: orb pulse, stamp fly-in, toast. For rare/legendary show “#n of all time”.

## Telemetry & Anti-abuse
- Emit `event_stamp_awarded {user_id, stamp_id, rarity, source_type, source_id, event_uuid}`.
- Monitor issuance rate by rarity. Flag bursts, identical device ids, or repeated identical metadata for review.
