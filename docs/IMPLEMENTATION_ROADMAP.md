# XP, Quest & Streak Implementation Roadmap

## Quick Reference
- **XP System**: [XP_LEVEL_SYSTEM.md](./XP_LEVEL_SYSTEM.md) - Master progression with 50 levels
- **Quest System**: [QUEST_SYSTEM.md](./QUEST_SYSTEM.md) - Simplified, direct verification quests
- **Streak System**: [STREAK_SYSTEM.md](./STREAK_SYSTEM.md) - Daily engagement rewards

## Priority Order

### 🔥 Phase 1: XP Level System (HIGHEST PRIORITY)
**Goal:** Make XP meaningful with proper levels and titles

#### 1.1 Create Level Constants File
```bash
touch src/constants/xpLevels.ts
```

**File:** `/src/constants/xpLevels.ts`
```typescript
export interface LevelConfig {
  level: number;
  xpRequired: number;
  cumulativeXp: number;
  title: string;
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
}

export const XP_LEVELS: LevelConfig[] = [
  { level: 1, xpRequired: 0, cumulativeXp: 0, title: 'Newcomer', tier: 'explorer' },
  { level: 2, xpRequired: 100, cumulativeXp: 100, title: 'Observer', tier: 'explorer' },
  { level: 3, xpRequired: 400, cumulativeXp: 500, title: 'Wanderer', tier: 'explorer' },
  // ... continue for all 50 levels (see XP_LEVEL_SYSTEM.md)
];

export function getLevelFromXp(totalXp: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= XP_LEVELS[i].cumulativeXp) {
      return XP_LEVELS[i].level;
    }
  }
  return 1;
}

export function getLevelConfig(level: number): LevelConfig {
  return XP_LEVELS.find(l => l.level === level) || XP_LEVELS[0];
}

export function getProgressToNextLevel(currentXp: number) {
  const currentLevel = getLevelFromXp(currentXp);
  const currentLevelConfig = getLevelConfig(currentLevel);
  const nextLevelConfig = getLevelConfig(currentLevel + 1);

  const xpInCurrentLevel = currentXp - currentLevelConfig.cumulativeXp;
  const xpNeededForNext = nextLevelConfig.xpRequired;
  const progressPercent = (xpInCurrentLevel / xpNeededForNext) * 100;

  return {
    currentLevel,
    currentLevelTitle: currentLevelConfig.title,
    nextLevel: currentLevel + 1,
    nextLevelTitle: nextLevelConfig.title,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent: Math.min(progressPercent, 100),
    tier: currentLevelConfig.tier,
  };
}
```

**Time Estimate:** 1 hour

#### 1.2 Update Database Schema
```sql
-- Add level title to profiles
ALTER TABLE profiles
ADD COLUMN level_title TEXT DEFAULT 'Newcomer',
ADD COLUMN level_tier TEXT DEFAULT 'explorer';

-- Function to update level title when XP changes
CREATE OR REPLACE FUNCTION calculate_level_title(p_xp INTEGER)
RETURNS TEXT AS $$
  -- This will be called from app logic, not DB trigger
  -- App will pass the calculated title
$$ LANGUAGE sql IMMUTABLE;
```

**Time Estimate:** 30 minutes

#### 1.3 Update XP Display Components

**File:** `/src/utils/xpLevel.ts`
Replace current simple formula with import from xpLevels:
```typescript
export { getLevelFromXp, getXpForNextLevel, getLevelConfig, getProgressToNextLevel } from '@/constants/xpLevels';
```

**File:** `/src/components/modals/XPDetailModal.js`
Add level title display:
```jsx
// Update to show level title
<View style={styles.levelContainer}>
  <Text style={styles.levelNumber}>{level}</Text>
  <Text style={styles.levelTitle}>{levelTitle}</Text>
</View>
```

**File:** `/src/features/home/homeView.tsx` (or wherever XP card is)
Add level title to XP card:
```jsx
<XPCard
  currentXP={xp.xp}
  level={xp.level}
  levelTitle={levelTitle}  // NEW
  xpForNextLevel={xp.xpForNextLevel}
  onPress={() => setShowXPModal(true)}
/>
```

**Time Estimate:** 2 hours

#### 1.4 Update Supabase Functions

**File:** `/src/services/gateways/supabaseGateway.ts`

Update `fetchXpSummary` to include level title:
```typescript
export async function fetchXpSummary(userId: string): Promise<FetchXpSummaryResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("xp, level, xp_spent, level_title")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const xp = coerceNumber(data?.xp, 0);
  const level = coerceNumber(data?.level, 1);
  const levelTitle = data?.level_title || 'Newcomer';

  return {
    xp,
    level,
    levelTitle,  // NEW
    xpSpent: coerceNumber(data?.xp_spent, 0),
  };
}
```

Update `awardXp` to update level title:
```typescript
export async function awardXp(params: AwardXpParams): Promise<void> {
  // ... existing code ...

  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_amount: finalAmount,
  });

  if (error) throw error;

  // Update level title based on new XP
  const newXpTotal = await fetchXpSummary(userId);
  const levelInfo = getProgressToNextLevel(newXpTotal.xp);

  await supabase
    .from('profiles')
    .update({
      level_title: levelInfo.currentLevelTitle,
      level_tier: levelInfo.tier,
    })
    .eq('id', userId);

  // ... rest of existing code ...
}
```

**Time Estimate:** 1 hour

**TOTAL PHASE 1:** ~4.5 hours

---

### 🎯 Phase 2: Streak Expansion (HIGH PRIORITY)
**Goal:** Extend streaks to all activities, not just scans

#### 2.1 Update Streak Triggers

**File:** `/src/services/gateways/supabaseGateway.ts`

```typescript
// Define sources that should trigger streak updates
const STREAK_SOURCES = [
  'building_scan',
  'photo_contribution',
  'building_contribution',
  'quest_completion',
] as const;

export async function awardXp(params: AwardXpParams): Promise<void> {
  // ... existing code ...

  // Update daily streak after awarding XP (UPDATED)
  if (STREAK_SOURCES.includes(source as any)) {
    try {
      const streakUpdate = await updateDailyStreak(userId);
      if (streakUpdate.isNewDay) {
        log.info(`[${source}] Daily streak updated: ${streakUpdate.streakCount} days`);

        // Check for milestone celebrations
        if ([3, 7, 30, 100].includes(streakUpdate.streakCount)) {
          // TODO: Trigger streak milestone notification
          log.info(`🎉 Streak milestone reached: ${streakUpdate.streakCount} days`);
        }
      }
    } catch (streakUpdateError) {
      log.warn("[supabaseGateway] Failed to update daily streak", streakUpdateError);
    }
  }

  // ... rest of existing code ...
}
```

**Time Estimate:** 30 minutes

#### 2.2 Test Streak Updates

Test that streaks update on:
- ✅ Building scans (already works)
- Photo contributions
- Full building contributions

**Time Estimate:** 1 hour

**TOTAL PHASE 2:** ~1.5 hours

---

### 📋 Phase 3: Quest Core Infrastructure (MEDIUM PRIORITY)
**Goal:** Set up backend for quest tracking and verification

#### 3.1 Create Quest Events Table

**SQL:**
```sql
CREATE TABLE quest_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  quest_id UUID REFERENCES quests(id),
  event_type TEXT NOT NULL, -- 'scan', 'photo_contribution', 'building_contribution'
  event_data JSONB NOT NULL, -- { building_bin, neighborhood, borough, style, etc. }
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  INDEX idx_quest_events_user_quest (user_id, quest_id),
  INDEX idx_quest_events_user_created (user_id, created_at),
  INDEX idx_quest_events_created (created_at)
);

-- Automatically delete old events (30 days)
CREATE INDEX idx_quest_events_cleanup ON quest_events(created_at)
  WHERE created_at < NOW() - INTERVAL '30 days';
```

**Time Estimate:** 30 minutes

#### 3.2 Backend: Quest Event Recording

**File:** `/backend/routers/quests.py` (new file)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

router = APIRouter(prefix="/api/quests", tags=["quests"])

@router.post("/record-event")
async def record_quest_event(
    user_id: str = Form(...),
    event_type: str = Form(...),  # 'scan', 'photo_contribution', etc.
    event_data: dict = Form(...),  # JSON with building info
    db: AsyncSession = Depends(get_db)
):
    """
    Record an event that may contribute to active quests.
    Checks active quests and updates progress if applicable.
    """
    # Get user's active quests
    user_quests = await db.execute(
        text("""
            SELECT
                daily_quest_id,
                daily_quest_progress,
                daily_quest_completed,
                weekly_quest_id,
                weekly_quest_progress,
                weekly_quest_completed
            FROM profiles
            WHERE id = :user_id
        """),
        {'user_id': user_id}
    )
    user_data = user_quests.fetchone()

    quest_updates = []

    # Check daily quest
    if user_data.daily_quest_id and not user_data.daily_quest_completed:
        quest = await get_quest(user_data.daily_quest_id, db)
        if await verify_quest_progress(user_id, quest, event_data, db):
            new_progress = user_data.daily_quest_progress + 1
            completed = new_progress >= quest.target_count

            await db.execute(
                text("""
                    UPDATE profiles
                    SET daily_quest_progress = :progress,
                        daily_quest_completed = :completed
                    WHERE id = :user_id
                """),
                {'progress': new_progress, 'completed': completed, 'user_id': user_id}
            )

            quest_updates.append({
                'type': 'daily',
                'quest_id': quest.id,
                'title': quest.title,
                'progress': new_progress,
                'target': quest.target_count,
                'completed': completed,
                'xp_reward': quest.xp_reward if completed else None
            })

            # Award XP if completed
            if completed:
                await award_quest_xp(user_id, quest, db)

    # Check weekly quest (similar logic)
    # ...

    # Record the event
    await db.execute(
        text("""
            INSERT INTO quest_events (user_id, quest_id, event_type, event_data)
            VALUES (:user_id, :quest_id, :event_type, :event_data::jsonb)
        """),
        {
            'user_id': user_id,
            'quest_id': user_data.daily_quest_id,  # or weekly
            'event_type': event_type,
            'event_data': json.dumps(event_data)
        }
    )

    await db.commit()

    return {
        'success': True,
        'quest_updates': quest_updates
    }
```

**Time Estimate:** 3 hours

#### 3.3 Backend: Quest Verification Logic

**File:** `/backend/services/quest_verification.py` (new file)

```python
async def verify_quest_progress(
    user_id: str,
    quest: Quest,
    event_data: dict,
    db: AsyncSession
) -> bool:
    """
    Returns True if this event should increment quest progress.
    """
    verification = quest.verification
    method = verification.get('method')

    if method == 'scan_count':
        # Check uniqueness if required
        if verification.get('unique'):
            building_bin = event_data.get('building_bin')
            existing = await db.execute(
                text("""
                    SELECT COUNT(*) FROM quest_events
                    WHERE user_id = :user_id
                    AND quest_id = :quest_id
                    AND event_data->>'building_bin' = :bin
                """),
                {'user_id': user_id, 'quest_id': quest.id, 'bin': building_bin}
            )
            return existing.scalar() == 0  # Only count if not already scanned

        return True  # Count all scans

    elif method == 'photo_count':
        return event_data.get('event_type') == 'photo_contribution'

    elif method == 'unique_neighborhoods':
        # Count distinct neighborhoods
        result = await db.execute(
            text("""
                SELECT COUNT(DISTINCT event_data->>'neighborhood')
                FROM quest_events
                WHERE user_id = :user_id AND quest_id = :quest_id
            """),
            {'user_id': user_id, 'quest_id': quest.id}
        )
        return result.scalar() < quest.target_count

    # Add more verification methods as needed

    return False
```

**Time Estimate:** 2 hours

#### 3.4 Frontend: Quest Progress Updates

**File:** `/src/services/gateways/questGateway.ts` (new file)

```typescript
const API_BASE = 'https://lucienmount--nyc-scan-api-fastapi-app.modal.run/api';

export async function recordQuestEvent(params: {
  userId: string;
  eventType: 'scan' | 'photo_contribution' | 'building_contribution';
  eventData: {
    building_bin?: string;
    neighborhood?: string;
    borough?: string;
    architectural_style?: string;
  };
}): Promise<QuestEventResult> {
  const response = await fetch(`${API_BASE}/quests/record-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await response.json();
}
```

**Update:** `/src/screens/Scan/ScanScreen.js`
```javascript
// After successful scan
const questResult = await recordQuestEvent({
  userId: session.user.id,
  eventType: 'scan',
  eventData: {
    building_bin: data.building.bin,
    neighborhood: data.building.neighborhood,
    borough: data.building.borough,
    architectural_style: data.building.architectural_style,
  },
});

// Show quest progress updates
if (questResult.quest_updates?.length > 0) {
  questResult.quest_updates.forEach(update => {
    if (update.completed) {
      showQuestCompletionModal(update);
    } else {
      showToast(`${update.title}: ${update.progress}/${update.target}`);
    }
  });
}
```

**Time Estimate:** 2 hours

**TOTAL PHASE 3:** ~7.5 hours

---

### 🎮 Phase 4: Quest Templates (MEDIUM PRIORITY)
**Goal:** Create initial daily and weekly quests

#### 4.1 Seed Initial Quests

**SQL:**
```sql
-- Daily Quest: Scan 3 buildings
INSERT INTO quests (type, quest_type, title, description, target_count, xp_reward, verification)
VALUES (
  'daily',
  'scan_count',
  'Daily Scanner',
  'Scan 3 different buildings today',
  3,
  50,
  '{"method": "scan_count", "unique": true, "time_window": "24h"}'::jsonb
);

-- Daily Quest: Photo Contributor
INSERT INTO quests (type, quest_type, title, description, target_count, xp_reward, verification)
VALUES (
  'daily',
  'photo_contribution',
  'Photo Contributor',
  'Submit 2 building photos today',
  2,
  40,
  '{"method": "photo_count", "time_window": "24h"}'::jsonb
);

-- Weekly Quest: Power User
INSERT INTO quests (type, quest_type, title, description, target_count, xp_reward, rewards, verification)
VALUES (
  'weekly',
  'scan_count',
  'Power User',
  'Scan 25 unique buildings this week',
  25,
  300,
  '{"stamps": ["Power User"], "achievements": ["Weekly Warrior"]}'::jsonb,
  '{"method": "scan_count", "unique": true, "time_window": "7d"}'::jsonb
);
```

**Time Estimate:** 1 hour

#### 4.2 Quest Assignment Logic

**File:** `/backend/routers/quests.py`

```python
@router.post("/assign-daily-quest")
async def assign_daily_quest(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Assign a random daily quest to user."""
    # Get random active daily quest
    quest = await db.execute(
        text("""
            SELECT * FROM quests
            WHERE type = 'daily'
            AND (active_until IS NULL OR active_until >= NOW())
            ORDER BY RANDOM()
            LIMIT 1
        """)
    )
    quest_row = quest.fetchone()

    # Assign to user
    await db.execute(
        text("""
            UPDATE profiles
            SET daily_quest_id = :quest_id,
                daily_quest_progress = 0,
                daily_quest_completed = FALSE
            WHERE id = :user_id
        """),
        {'quest_id': quest_row.id, 'user_id': user_id}
    )

    await db.commit()
    return {'quest': quest_row}
```

**Time Estimate:** 1 hour

**TOTAL PHASE 4:** ~2 hours

---

## Summary Timeline

| Phase | Description | Time Estimate | Priority |
|-------|-------------|---------------|----------|
| Phase 1 | XP Level System | 4.5 hours | 🔥 Highest |
| Phase 2 | Streak Expansion | 1.5 hours | 🎯 High |
| Phase 3 | Quest Infrastructure | 7.5 hours | 📋 Medium |
| Phase 4 | Quest Templates | 2 hours | 🎮 Medium |
| **TOTAL** | | **15.5 hours** | |

## Recommended Development Order

### Week 1: XP Foundation
- Day 1-2: Phase 1 (XP Level System)
  - Create `xpLevels.ts` with all 50 levels
  - Update database schema
  - Update display components
- Day 3: Phase 2 (Streak Expansion)
  - Extend streak triggers
  - Test all streak sources

### Week 2: Quest System
- Day 1-2: Phase 3.1-3.2 (Backend Infrastructure)
  - Create quest_events table
  - Build event recording endpoint
- Day 3: Phase 3.3-3.4 (Verification & Frontend)
  - Implement verification logic
  - Integrate with scan flow
- Day 4: Phase 4 (Quest Templates)
  - Seed initial quests
  - Quest assignment logic
  - Test end-to-end

## Testing Checklist

### XP System
- [ ] Level titles display correctly
- [ ] Progress bar shows accurate percentage
- [ ] Level-up triggers at correct XP thresholds
- [ ] All 50 levels defined with unique titles
- [ ] Tier badges display (Explorer, Connoisseur, Authority, Mythic)

### Streak System
- [ ] Streak updates on building scan
- [ ] Streak updates on photo contribution
- [ ] Streak updates on full contribution
- [ ] XP multiplier applies correctly (1.0x, 1.5x, 2.0x, 3.0x)
- [ ] Streak display shows current count and multiplier

### Quest System
- [ ] Daily quest assigned to new users
- [ ] Quest progress increments on qualifying actions
- [ ] Quest completion detected and rewards awarded
- [ ] Quest UI shows accurate progress
- [ ] Completed quests marked correctly
- [ ] Weekly quests work independently from daily

## Next Steps After Implementation

1. **Analytics Dashboard**
   - Track XP distribution across users
   - Monitor quest completion rates
   - Identify popular quests

2. **Quest Rotation**
   - Seasonal quests (summer, winter, holidays)
   - Event-based quests
   - Limited-time challenges

3. **Social Features**
   - Friends leaderboard
   - Collaborative quests
   - Quest challenges

4. **Advanced Quests**
   - Neighborhood-specific quests
   - Style-hunting challenges
   - Historical period quests (scan 5 pre-1900 buildings)
