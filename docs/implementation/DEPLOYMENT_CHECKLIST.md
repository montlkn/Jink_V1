# Deployment Checklist - Aesthetic Algorithm + Route Tier System

## 🔴 Critical: Run Database Migrations FIRST

Before testing the app, you **must** run these migrations in your Supabase SQL Editor:

### Step 1: Core Tables
```sql
-- Copy and paste the entire contents of:
supabase/migrations/20251201_ensure_all_tables.sql
```

This creates:
- ✅ `user_aesthetic_events` table (fixes "relation does not exist" error)
- ✅ `user_aesthetic_profiles` table
- ✅ `xp_transactions` ledger
- ✅ `user_session_tracking` table
- ✅ Adds `route_tier`, `route_xp_multiplier` to `walk_summaries`
- ✅ Adds `total_xp` to `profiles`

### Step 2: XP Functions
```sql
-- Copy and paste the entire contents of:
supabase/migrations/20251201_add_route_tier_system.sql
```

This creates:
- ✅ `complete_walk_session()` RPC function
- ✅ XP calculation with all multipliers (duration × route_tier × streak)

## ✅ Verification Tests

After running migrations, test in Supabase SQL Editor:

```sql
-- 1. Check tables exist
SELECT COUNT(*) FROM user_aesthetic_events;
SELECT COUNT(*) FROM user_aesthetic_profiles;
SELECT COUNT(*) FROM xp_transactions;

-- 2. Check walk_summaries columns
SELECT route_tier, route_xp_multiplier
FROM walk_summaries
LIMIT 1;

-- 3. Test complete_walk_session function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'complete_walk_session';
```

## 🐛 Known Issues & Fixes

### Issue 1: "No buildings selected within time budget"
**Cause**: 21 minutes is too short for nearby buildings with current walking speed (4.5 km/h)

**Fixed**: Added fallback in `routeBuilderService.ts` that selects 5 closest buildings

**Test**: Try with 45+ minute walks for better results

### Issue 2: "relation user_aesthetic_events does not exist"
**Cause**: Migration hasn't been run

**Fix**: Run Step 1 migration above

### Issue 3: XP not being awarded
**Cause**: Missing `complete_walk_session` function or `xp_transactions` table

**Fix**: Run both migrations (Steps 1 & 2)

## 📱 App Testing Workflow

Once migrations are complete:

1. **Start a walk** (WalkStartScreen)
   - Select 45+ minutes for best results
   - Route builder will tier the route (aesthetic/behavioral/wildcard)
   - Walk session created with `route_tier` and `route_xp_multiplier`

2. **Complete the walk** (WalkNavScreen)
   - Call `walksActions.complete({ userId, walkId })`
   - XP calculated: `base × duration_mult × route_tier_mult × streak_mult`
   - Result logged with breakdown

3. **Verify XP awarded**
   ```sql
   -- Check XP transactions
   SELECT * FROM xp_transactions
   WHERE user_id = '<your-user-id>'
   ORDER BY created_at DESC
   LIMIT 5;

   -- Check profile total
   SELECT total_xp, level FROM profiles
   WHERE id = '<your-user-id>';
   ```

## 🎯 Expected Behavior

### Wildcard Route (2.5x XP)
- Avg compatibility < 20%
- Alert: "🎲 Exploration Mode"
- Example: 3 scans, 38 min, 7-day streak
  - Base: 230 XP
  - Duration (35-45min): ×1.2
  - Wildcard: ×2.5
  - Streak (7 days): ×2.0
  - **Total: 1,380 XP** 🎲

### Behavioral Route (1.0x XP)
- < 3 aesthetic matches
- Alert: "🔍 Discovery Mode"
- Based on past scan history

### Aesthetic Route (1.0x XP)
- Sufficient aesthetic matches (≥40% alignment)
- No special alert

## 🔧 Next Steps

- [ ] Run migrations in Supabase
- [ ] Test walk creation → completion flow
- [ ] Verify XP calculations
- [ ] Add UI badges (Phase D.5) to show route tier
- [ ] Performance testing (Phase E)

## 📚 Files Changed

### New Files
- `src/services/routeBuilderService.ts` - Time-constrained route generation
- `src/services/gateways/userBehaviorGateway.ts` - Behavioral history tracking
- `supabase/migrations/20251201_ensure_all_tables.sql` - Core tables
- `supabase/migrations/20251201_add_route_tier_system.sql` - XP system
- `supabase/MIGRATION_GUIDE.md` - Migration instructions

### Modified Files
- `src/screens/Walk/WalkStartScreen.js` - Route builder integration + walk creation
- `src/services/gateways/supabaseGateway.ts` - Added `startWalk()`, enhanced `completeWalk()`
- `src/config/aestheticAlgorithm.ts` - Algorithm config updates
- `src/services/aestheticAlgorithmService.ts` - New algorithm functions
- `src/services/recommendationService.ts` - Exposure-based novelty, bridge items
- `src/screens/Scan/BuildingInfoScreen.tsx` - Dwell time tracking
- `src/screens/Walk/WalkNavScreen.js` - Skip button with quick_dismiss

## 🎮 Test Scenarios

1. **Short walk (21 min)** → May hit "no buildings selected" → Uses fallback (5 closest)
2. **Medium walk (45 min)** → Optimal for aesthetic/behavioral routes
3. **Long walk (90 min)** → 2.0x duration multiplier kicks in
4. **New user (no scans)** → Wildcard mode likely (2.5x XP)
5. **Active user (7+ day streak)** → 2.0x streak multiplier
