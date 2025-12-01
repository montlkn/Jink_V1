# Database Migration Guide

## Required Migrations for Aesthetic Algorithm + Route Tier System

Run these migrations in your Supabase SQL Editor in **this exact order**:

### 1. Core Tables Setup
```bash
# Run this first to ensure all base tables exist
supabase/migrations/20251201_ensure_all_tables.sql
```

This creates/updates:
- `xp_transactions` (XP ledger system)
- `user_aesthetic_events` (behavioral tracking)
- `user_aesthetic_profiles` (aesthetic profile storage)
- `user_session_tracking` (sequence bonus tracking)
- Adds route tier columns to `walk_summaries`
- Adds `total_xp` to `profiles`

### 2. Algorithm Upgrade (if not already applied)
```bash
# Optional: Only if you haven't run this yet
supabase/migrations/20251201_algorithm_upgrade.sql
```

This adds advanced algorithm fields:
- `action_diversity`, `entropy`, `confidence_components` to profiles
- `contextual_weight`, `sequence_bonus` to events

### 3. Route Tier System with XP Functions
```bash
# Run this last to add the complete_walk_session RPC
supabase/migrations/20251201_add_route_tier_system.sql
```

This creates:
- `complete_walk_session(p_user_id, p_walk_id, p_completed_at)` RPC function
- Applies all multipliers: duration × route_tier × streak

## Quick Test

After running migrations, test in Supabase SQL Editor:

```sql
-- Verify tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'user_aesthetic_events',
  'user_aesthetic_profiles',
  'xp_transactions',
  'user_session_tracking'
);

-- Should return 4 rows

-- Verify walk_summaries has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'walk_summaries'
AND column_name IN ('route_tier', 'route_xp_multiplier');

-- Should return 2 rows

-- Verify complete_walk_session function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'complete_walk_session';

-- Should return 1 row
```

## Troubleshooting

### Error: "relation user_aesthetic_events does not exist"
→ Run migration #1 (`20251201_ensure_all_tables.sql`)

### Error: "column route_tier does not exist"
→ Run migration #3 (`20251201_add_route_tier_system.sql`)

### Error: "function complete_walk_session does not exist"
→ Run migration #3 (it creates the RPC function)

### XP not being awarded
→ Check `profiles.total_xp` column exists (migration #1)
→ Check `xp_transactions` table exists (migration #1)
→ Verify RPC function with: `SELECT * FROM complete_walk_session('<user_id>', '<walk_id>', NOW());`

## Migration Status Check

Run this to see what's applied:

```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

If using local Supabase CLI:
```bash
supabase db diff
```
