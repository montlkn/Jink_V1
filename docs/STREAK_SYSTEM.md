# Streak System

## Overview
Streaks reward **consistent daily engagement** with XP multipliers. Currently implemented for building scans, needs extension to contributions.

## Current Implementation

### Streak Thresholds
```typescript
// From designConstants.ts
export const STREAK_CONFIG = {
  thresholds: {
    base: { min: 0, multiplier: 1.0, color: ELEMENT_COLORS.streak.inactive },
    bronze: { min: 3, multiplier: 1.5, color: ELEMENT_COLORS.streak.active },
    silver: { min: 7, multiplier: 2.0, color: ELEMENT_COLORS.streak.active },
    gold: { min: 30, multiplier: 3.0, color: ELEMENT_COLORS.streak.multiplier },
  },
};
```

### Current Trigger
Streaks are updated ONLY on `source: 'building_scan'`:

```typescript
// supabaseGateway.ts:500-509
if (source === "building_scan") {
  try {
    const streakUpdate = await updateDailyStreak(userId);
    if (streakUpdate.isNewDay) {
      log.info(`Daily streak updated: ${streakUpdate.streakCount} days`);
    }
  } catch (streakUpdateError) {
    log.warn("Failed to update daily streak", streakUpdateError);
  }
}
```

## Proposed Enhancements

### 1. Expand Streak Triggers

Update streak on **any meaningful daily activity**, not just scans:

```typescript
// Update streak for these sources:
const STREAK_SOURCES = [
  'building_scan',
  'photo_contribution',
  'building_contribution',
  'quest_completion',
  'walk_completion',
];

// In awardXp()
if (STREAK_SOURCES.includes(source)) {
  try {
    const streakUpdate = await updateDailyStreak(userId);
    if (streakUpdate.isNewDay) {
      log.info(`[${source}] Daily streak updated: ${streakUpdate.streakCount} days`);

      // Show streak celebration if it's a milestone
      if (streakUpdate.streakCount === 3 ||
          streakUpdate.streakCount === 7 ||
          streakUpdate.streakCount === 30) {
        // Trigger streak milestone notification
        notifyStreakMilestone(userId, streakUpdate.streakCount);
      }
    }
  } catch (streakUpdateError) {
    log.warn("Failed to update daily streak", streakUpdateError);
  }
}
```

### 2. Streak Multiplier Application

**Current Behavior:** Multiplier is applied BEFORE awarding XP

```typescript
// supabaseGateway.ts:475-488
let finalAmount = amount;
try {
  const streakData = await fetchStreak(userId);
  finalAmount = Math.round(amount * streakData.multiplier);
  if (streakData.multiplier > 1) {
    log.info(`XP multiplier applied: ${amount} × ${streakData.multiplier} = ${finalAmount}`);
  }
} catch (streakError) {
  log.warn("Failed to fetch streak for XP multiplier, using base amount", streakError);
}
```

**Recommendation:** Keep current behavior - it's good! But document it clearly.

### 3. Streak Protection (Grace Period)

Add a **24-hour grace period** to prevent streak loss from timezone issues or single missed days:

```sql
-- Update database function
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS TABLE (
  streak_count INTEGER,
  is_new_day BOOLEAN,
  previous_streak INTEGER
) AS $$
DECLARE
  last_activity TIMESTAMP;
  current_streak INTEGER;
  hours_since_activity INTEGER;
BEGIN
  SELECT last_activity_date, streak_days INTO last_activity, current_streak
  FROM profiles
  WHERE id = p_user_id;

  hours_since_activity := EXTRACT(EPOCH FROM (NOW() - last_activity)) / 3600;

  -- Streak continues if within 48 hours (24h grace period)
  IF hours_since_activity <= 48 THEN
    -- Same day or grace period - increment streak
    UPDATE profiles
    SET streak_days = streak_days + 1,
        last_activity_date = NOW()
    WHERE id = p_user_id;

    RETURN QUERY SELECT current_streak + 1, TRUE, current_streak;
  ELSE
    -- Streak broken - reset to 1
    UPDATE profiles
    SET streak_days = 1,
        last_activity_date = NOW(),
        longest_streak = GREATEST(longest_streak, current_streak)
    WHERE id = p_user_id;

    RETURN QUERY SELECT 1, TRUE, current_streak;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. Streak Recovery (Freeze)

Allow users to **freeze their streak** for special circumstances:

```typescript
// New feature: Streak Freeze
interface StreakFreeze {
  userId: string;
  freezeCount: number;  // User has 2 freezes per month
  lastFreezeDate: Date | null;
}

async function useStreakFreeze(userId: string): Promise<boolean> {
  // Check if user has freezes available
  const freezeData = await getStreakFreezes(userId);

  if (freezeData.freezeCount > 0) {
    // Use a freeze - extends grace period by 24 hours
    await db.execute(
      text(`
        UPDATE profiles
        SET streak_freezes = streak_freezes - 1,
            last_activity_date = NOW()  -- Reset activity timestamp
        WHERE id = :user_id
      `),
      { user_id: userId }
    );

    return true;
  }

  return false;
}
```

## Streak Display

### 1. Home Screen (StreakCard)
Already implemented! Shows:
- Current streak count
- Current multiplier (Bronze/Silver/Gold)

```tsx
<StreakCard streakCount={7} />
// Displays: "7 DAYS" with "2.0x MULTIPLIER"
```

### 2. XP Detail Modal
Already implemented! Shows:
- Streak count
- Multiplier bonus badge (if >= 3 days)

### 3. Post-Action Feedback

After scan/contribution, show streak info:
```tsx
// Good example
+40 XP (20 × 2.0x streak bonus)
🔥 7-day streak!
```

```tsx
// Streak milestone
🎉 7-DAY STREAK!
You've unlocked Silver Tier
XP Multiplier: 2.0x
```

### 4. Streak Warning (Breaking Soon)

If user hasn't scanned in 20+ hours:
```tsx
<StreakWarningBanner>
  ⚠️ Your 15-day streak expires in 4 hours!
  Scan a building to keep it alive.
</StreakWarningBanner>
```

## Database Schema

### Current Schema
```sql
profiles {
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP
}
```

### Proposed Additions
```sql
ALTER TABLE profiles
ADD COLUMN streak_freezes INTEGER DEFAULT 2,  -- Resets monthly
ADD COLUMN last_freeze_date TIMESTAMP,
ADD COLUMN streak_tier TEXT DEFAULT 'base';  -- 'base', 'bronze', 'silver', 'gold'

-- Streak history tracking
CREATE TABLE streak_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  activity_type TEXT NOT NULL,  -- 'scan', 'contribution', 'quest', etc.
  streak_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date),
  INDEX idx_streak_history_user_date (user_id, date)
);
```

## Streak Analytics

Track streak engagement:

```sql
-- Monthly streak report
CREATE OR REPLACE FUNCTION get_streak_stats(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  total_days_active INTEGER,
  current_tier TEXT,
  days_until_next_tier INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    streak_days,
    longest_streak,
    (SELECT COUNT(*) FROM streak_history WHERE user_id = p_user_id),
    CASE
      WHEN streak_days >= 30 THEN 'gold'
      WHEN streak_days >= 7 THEN 'silver'
      WHEN streak_days >= 3 THEN 'bronze'
      ELSE 'base'
    END as tier,
    CASE
      WHEN streak_days >= 30 THEN 0
      WHEN streak_days >= 7 THEN 30 - streak_days
      WHEN streak_days >= 3 THEN 7 - streak_days
      ELSE 3 - streak_days
    END as days_to_next
  FROM profiles
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Plan

### Phase 1: Extend Streak Triggers ✅
1. Update `STREAK_SOURCES` array
2. Update `awardXp()` to check array membership
3. Test streak updates on:
   - ✅ Building scans (already works)
   - Photo contributions
   - Full contributions
   - Quest completions

### Phase 2: Streak Feedback
1. Post-scan XP display with multiplier breakdown
2. Streak milestone celebrations (3, 7, 30 days)
3. Streak warning notifications

### Phase 3: Streak Protection
1. Implement grace period (24-48h)
2. Add streak freeze system
3. Monthly freeze resets

### Phase 4: Streak Analytics
1. Streak history tracking
2. Streak stats view in profile
3. Longest streak leaderboard

## UI Components

### StreakMilestoneModal
```tsx
interface StreakMilestoneModalProps {
  visible: boolean;
  streakCount: number;
  tier: 'bronze' | 'silver' | 'gold';
  multiplier: number;
  onClose: () => void;
}

<StreakMilestoneModal
  visible={showMilestone}
  streakCount={7}
  tier="silver"
  multiplier={2.0}
  onClose={() => setShowMilestone(false)}
/>
```

### StreakWarningBanner
```tsx
interface StreakWarningProps {
  hoursRemaining: number;
  currentStreak: number;
  onDismiss: () => void;
}

<StreakWarningBanner
  hoursRemaining={4}
  currentStreak={15}
  onDismiss={() => setDismissed(true)}
/>
```

## Gamification Ideas

### Streak Challenges
Special rewards for sustained streaks:

```typescript
const STREAK_CHALLENGES = [
  { days: 7, reward: { xp: 100, stamp: 'Week Warrior' } },
  { days: 30, reward: { xp: 500, stamp: 'Monthly Master' } },
  { days: 100, reward: { xp: 2000, stamp: 'Century Club' } },
  { days: 365, reward: { xp: 10000, stamp: 'Year Round' } },
];
```

### Streak Leaderboard
```tsx
<StreakLeaderboard>
  <StreakRank rank={1} user="archEnthusiast" streak={152} />
  <StreakRank rank={2} user="NYCExplorer" streak={147} />
  <StreakRank rank={3} user="buildingHunter" streak={134} />
</StreakLeaderboard>
```

### Streak Share
```tsx
<ShareStreakButton
  streakCount={30}
  tier="gold"
  onShare={() => shareToSocial({
    text: "🔥 30-day streak! 3x XP multiplier in Architecture Explorer",
    image: generateStreakBadge(30, 'gold')
  })}
/>
```

## Key Takeaways

1. **Expand triggers** - Streaks should update on ANY daily activity, not just scans
2. **Keep multipliers** - Current XP multiplier system is good
3. **Add protection** - Grace period prevents frustrating streak losses
4. **Celebrate milestones** - Visual celebrations at 3, 7, 30 days
5. **Show progress** - Clear feedback on how streak affects XP gains
