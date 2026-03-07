# Simplified Quest System

## Overview
Quests are **time-limited challenges** that encourage specific behaviors and exploration patterns. They use **direct verification** through GPS, photos, and scan data.

## Quest Types

### Daily Quests
Reset every 24 hours at midnight EST. Simple, achievable goals.

### Weekly Quests
Reset every Monday at midnight EST. More challenging, higher rewards.

## Verification Methods

### ✅ SIMPLE - Use These
1. **Scan Count** - Count successful building scans
2. **GPS Proximity** - Verify user visited specific location
3. **Photo Submission** - Count contributed photos
4. **Contribution Count** - Track building info submissions
5. **Streak Maintenance** - Check daily login/scan
6. **Neighborhood Coverage** - Visit X different neighborhoods (using borough/neighborhood from building data)
7. **Architectural Style** - Scan buildings of specific style (Art Deco, Beaux-Arts, etc.)
8. **Time-Based** - Complete within time window

### ❌ AVOID - Too Complex
- ~~Manual review/approval~~
- ~~Complex multi-step workflows~~
- ~~User-submitted proof that needs validation~~
- ~~Social features (shares, comments)~~

## Quest Templates

### Daily Quest Examples

#### 1. Daily Scanner
```json
{
  "quest_type": "scan_count",
  "title": "Daily Scanner",
  "description": "Scan 3 different buildings today",
  "target_count": 3,
  "xp_reward": 50,
  "verification": {
    "method": "scan_count",
    "unique": true,
    "time_window": "24h"
  }
}
```

#### 2. Neighborhood Explorer
```json
{
  "quest_type": "neighborhood_visit",
  "title": "Neighborhood Explorer",
  "description": "Scan buildings in 2 different neighborhoods",
  "target_count": 2,
  "xp_reward": 60,
  "rewards": {
    "stamps": ["Explorer"]
  },
  "verification": {
    "method": "unique_neighborhoods",
    "source": "building.neighborhood"
  }
}
```

#### 3. Streak Keeper
```json
{
  "quest_type": "streak_maintenance",
  "title": "Streak Keeper",
  "description": "Maintain your daily streak",
  "target_count": 1,
  "xp_reward": 30,
  "verification": {
    "method": "streak_check",
    "min_streak": 1
  }
}
```

#### 4. Photo Contributor
```json
{
  "quest_type": "photo_contribution",
  "title": "Photo Contributor",
  "description": "Submit 2 building photos today",
  "target_count": 2,
  "xp_reward": 40,
  "verification": {
    "method": "photo_count",
    "time_window": "24h"
  }
}
```

#### 5. Style Hunter
```json
{
  "quest_type": "architectural_style",
  "title": "Art Deco Detective",
  "description": "Scan 2 Art Deco buildings",
  "target_count": 2,
  "xp_reward": 75,
  "verification": {
    "method": "style_match",
    "required_style": "Art Deco"
  }
}
```

### Weekly Quest Examples

#### 1. Power User
```json
{
  "quest_type": "scan_count",
  "title": "Power User",
  "description": "Scan 25 unique buildings this week",
  "target_count": 25,
  "xp_reward": 300,
  "rewards": {
    "stamps": ["Power User"],
    "achievements": ["Weekly Warrior"]
  },
  "verification": {
    "method": "scan_count",
    "unique": true,
    "time_window": "7d"
  }
}
```

#### 2. Borough Tour
```json
{
  "quest_type": "borough_coverage",
  "title": "Borough Tour",
  "description": "Scan buildings in all 5 boroughs",
  "target_count": 5,
  "xp_reward": 500,
  "rewards": {
    "stamps": ["Five Borough Explorer"]
  },
  "verification": {
    "method": "unique_boroughs",
    "required_boroughs": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
  }
}
```

#### 3. Data Champion
```json
{
  "quest_type": "contribution_combo",
  "title": "Data Champion",
  "description": "Submit 5 photo contributions AND 2 full building submissions",
  "target_count": 7,
  "xp_reward": 400,
  "rewards": {
    "stamps": ["Data Validator", "Pioneer"]
  },
  "verification": {
    "method": "combined",
    "requirements": [
      {"type": "photo_contribution", "count": 5},
      {"type": "building_contribution", "count": 2}
    ]
  }
}
```

#### 4. Consistent Collector
```json
{
  "quest_type": "daily_consistency",
  "title": "Consistent Collector",
  "description": "Scan at least 1 building every day for 7 days",
  "target_count": 7,
  "xp_reward": 350,
  "rewards": {
    "stamps": ["Dedicated"]
  },
  "verification": {
    "method": "daily_scan_streak",
    "consecutive_days": 7
  }
}
```

## Database Schema

### Quests Table (already exists in Supabase)
```sql
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'daily' or 'weekly'
  quest_type TEXT NOT NULL, -- 'scan_count', 'neighborhood_visit', etc.
  title TEXT NOT NULL,
  description TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL,
  ep_reward INTEGER, -- deprecated, use xp_reward
  rewards JSONB, -- { "stamps": [...], "achievements": [...] }
  verification JSONB NOT NULL, -- verification config
  active_from TIMESTAMP,
  active_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### User Quest Progress (in profiles table)
```sql
-- Already exists:
profiles {
  daily_quest_id UUID,
  daily_quest_progress INTEGER DEFAULT 0,
  daily_quest_completed BOOLEAN DEFAULT FALSE,
  weekly_quest_id UUID,
  weekly_quest_progress INTEGER DEFAULT 0,
  weekly_quest_completed BOOLEAN DEFAULT FALSE
}
```

### Quest Events Tracking (new table)
```sql
CREATE TABLE quest_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  quest_id UUID REFERENCES quests(id),
  event_type TEXT NOT NULL, -- 'scan', 'photo_contribution', 'building_contribution'
  event_data JSONB, -- Store building BIN, neighborhood, style, etc.
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_quest_events_user_quest (user_id, quest_id),
  INDEX idx_quest_events_created (created_at)
);
```

## Verification Implementation

### Backend: `/api/quests/verify-progress`

```python
from datetime import datetime, timezone
from typing import Dict, Any

async def verify_quest_progress(
    user_id: str,
    quest: Quest,
    event_data: Dict[str, Any],
    db: AsyncSession
) -> bool:
    """
    Verify if an event contributes to quest progress.
    Returns True if progress should increment.
    """
    verification = quest.verification
    method = verification.get('method')

    if method == 'scan_count':
        # Check if scan is unique (if required)
        if verification.get('unique'):
            # Query quest_events to see if this building was already scanned
            building_bin = event_data.get('building_bin')
            existing = await db.execute(
                text("""
                    SELECT COUNT(*) FROM quest_events
                    WHERE user_id = :user_id
                    AND quest_id = :quest_id
                    AND event_type = 'scan'
                    AND event_data->>'building_bin' = :bin
                """),
                {'user_id': user_id, 'quest_id': quest.id, 'bin': building_bin}
            )
            if existing.scalar() > 0:
                return False  # Already scanned this building for this quest

        return True  # Count this scan

    elif method == 'unique_neighborhoods':
        neighborhood = event_data.get('neighborhood')
        if not neighborhood:
            return False

        # Count unique neighborhoods scanned
        result = await db.execute(
            text("""
                SELECT COUNT(DISTINCT event_data->>'neighborhood')
                FROM quest_events
                WHERE user_id = :user_id
                AND quest_id = :quest_id
                AND event_type = 'scan'
            """),
            {'user_id': user_id, 'quest_id': quest.id}
        )
        unique_count = result.scalar()
        return unique_count < quest.target_count  # Still have neighborhoods to visit

    elif method == 'style_match':
        required_style = verification.get('required_style')
        building_style = event_data.get('architectural_style')
        return building_style == required_style

    elif method == 'photo_count':
        # Simply count photo submissions
        return event_data.get('event_type') == 'photo_contribution'

    elif method == 'streak_check':
        # Check current streak against minimum
        streak_data = await get_user_streak(user_id, db)
        min_streak = verification.get('min_streak', 1)
        return streak_data.get('current_streak', 0) >= min_streak

    # ... more verification methods

    return False
```

### Frontend: Quest Progress Updates

After each scan/contribution, check active quests:

```typescript
// In ScanScreen after successful scan
async function updateQuestProgress(buildingData: BuildingData) {
  try {
    const response = await fetch(`${API_BASE}/quests/record-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        event_type: 'scan',
        event_data: {
          building_bin: buildingData.bin,
          neighborhood: buildingData.neighborhood,
          borough: buildingData.borough,
          architectural_style: buildingData.architectural_style,
        },
      }),
    });

    const result = await response.json();

    // Show quest progress updates
    if (result.quest_updates && result.quest_updates.length > 0) {
      result.quest_updates.forEach(update => {
        if (update.completed) {
          // Quest completed!
          showQuestCompletionModal(update);
        } else {
          // Progress update
          showQuestProgressToast(update);
        }
      });
    }
  } catch (error) {
    log.warn('Failed to update quest progress', error);
  }
}
```

## Quest Assignment Logic

### Daily Quest Assignment
```python
async def assign_daily_quest(user_id: str, db: AsyncSession):
    """
    Assign a random daily quest to user.
    Called at midnight or on first scan of the day.
    """
    # Get user's level to determine quest difficulty
    user_level = await get_user_level(user_id, db)

    # Get available daily quests appropriate for level
    quests = await db.execute(
        text("""
            SELECT * FROM quests
            WHERE type = 'daily'
            AND (active_from IS NULL OR active_from <= NOW())
            AND (active_until IS NULL OR active_until >= NOW())
            ORDER BY RANDOM()
            LIMIT 1
        """)
    )
    quest = quests.fetchone()

    # Assign to user
    await db.execute(
        text("""
            UPDATE profiles
            SET daily_quest_id = :quest_id,
                daily_quest_progress = 0,
                daily_quest_completed = FALSE
            WHERE id = :user_id
        """),
        {'quest_id': quest.id, 'user_id': user_id}
    )

    await db.commit()
    return quest
```

## UI Components

### Quest Card (already exists)
Update to show progress clearly:
```jsx
<QuestCard
  type="daily"
  title="Daily Scanner"
  description="Scan 3 different buildings today"
  progress={2}
  total={3}
  xpReward={50}
  completed={false}
/>
```

### Quest Completion Modal
```jsx
<QuestCompletionModal
  visible={showCompletion}
  questTitle="Daily Scanner"
  xpEarned={50}
  stamps={["Explorer"]}
  onClose={() => setShowCompletion(false)}
/>
```

### Quest Progress Toast
Small notification after scan:
```
✓ Daily Scanner: 2/3 buildings
```

## Implementation Roadmap

### Phase 1: Core Infrastructure
1. ✅ Quest data models
2. ✅ Quest selectors/hooks
3. ✅ Basic quest display (QuestView already exists)
4. ❌ Backend: Quest event tracking table
5. ❌ Backend: Quest verification endpoint

### Phase 2: Basic Quests
1. ❌ Implement scan_count verification
2. ❌ Implement photo_count verification
3. ❌ Daily quest assignment logic
4. ❌ Quest progress updates after scans
5. ❌ Quest completion detection

### Phase 3: Advanced Quests
1. ❌ Neighborhood/borough tracking
2. ❌ Style-based quests
3. ❌ Combination quests
4. ❌ Weekly quest system

### Phase 4: Polish
1. ❌ Quest completion animations
2. ❌ Quest history/archive
3. ❌ Quest notifications
4. ❌ Quest recommendations based on behavior
