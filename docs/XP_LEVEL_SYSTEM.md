# XP & Level System

## Overview
XP is the **master progression system** that ties together all in-app activities:
- Building scans
- Photo contributions
- Full building contributions
- Quest completion
- Daily streaks

## Current Formula
**Current Implementation:** `xpForNextLevel = level² × 100`

This means:
- Level 1 → 2: 100 XP
- Level 2 → 3: 400 XP
- Level 3 → 4: 900 XP
- Level 4 → 5: 1,600 XP
- Level 5 → 6: 2,500 XP

## XP Sources

### Primary Actions
| Action | Base XP | Notes |
|--------|---------|-------|
| Building Scan | 10-20 XP | First scan: 20 XP, Repeat scan: 10 XP |
| Photo Contribution | 10 XP/photo | Multi-angle photos (4 max = 40 XP) |
| Full Building Contribution | 30-45 XP | Address + metadata |
| Walk Completion | Variable | Based on buildings scanned |
| Quest Completion (Daily) | 50-100 XP | Defined per quest |
| Quest Completion (Weekly) | 200-500 XP | Defined per quest |

### Streak Multipliers
Streaks apply XP multipliers to scans:
- **Base (0-2 days):** 1.0x
- **Bronze (3-6 days):** 1.5x
- **Silver (7-29 days):** 2.0x
- **Gold (30+ days):** 3.0x

**Example:** With a 7-day streak, scanning a new building earns 20 XP × 2.0 = **40 XP**

## Proposed Level System

### Tier 1: Explorer (Levels 1-10)
Focus on learning the basics and exploring NYC architecture

| Level | XP Required | Cumulative XP | Title | Theme |
|-------|-------------|---------------|-------|-------|
| 1 | 0 | 0 | **Newcomer** | Just getting started |
| 2 | 100 | 100 | **Observer** | Learning to look |
| 3 | 400 | 500 | **Wanderer** | Exploring the streets |
| 4 | 900 | 1,400 | **Scout** | Finding hidden gems |
| 5 | 1,600 | 3,000 | **Enthusiast** | Developing passion |
| 6 | 2,500 | 5,500 | **Admirer** | Appreciating design |
| 7 | 3,600 | 9,100 | **Student** | Studying styles |
| 8 | 4,900 | 14,000 | **Apprentice** | Understanding history |
| 9 | 6,400 | 20,400 | **Explorer** | Mastering neighborhoods |
| 10 | 8,100 | 28,500 | **Pathfinder** | Charting new territory |

### Tier 2: Connoisseur (Levels 11-20)
Deep appreciation and understanding of architectural styles

| Level | XP Required | Cumulative XP | Title | Theme |
|-------|-------------|---------------|-------|-------|
| 11 | 10,000 | 38,500 | **Connoisseur** | Refined taste |
| 12 | 12,100 | 50,600 | **Specialist** | Deep knowledge |
| 13 | 14,400 | 65,000 | **Researcher** | Uncovering stories |
| 14 | 16,900 | 81,900 | **Documentarian** | Recording history |
| 15 | 19,600 | 101,500 | **Chronicler** | Preserving knowledge |
| 16 | 22,500 | 124,000 | **Curator** | Organizing beauty |
| 17 | 25,600 | 149,600 | **Scholar** | Academic depth |
| 18 | 28,900 | 178,500 | **Expert** | Recognized authority |
| 19 | 32,400 | 210,900 | **Archivist** | Guardian of records |
| 20 | 36,100 | 247,000 | **Historian** | Understanding eras |

### Tier 3: Authority (Levels 21-30)
Mastery and contribution to the community

| Level | XP Required | Cumulative XP | Title | Theme |
|-------|-------------|---------------|-------|-------|
| 21 | 40,000 | 287,000 | **Authority** | Trusted voice |
| 22 | 44,100 | 331,100 | **Mentor** | Teaching others |
| 23 | 48,400 | 379,500 | **Master** | Complete mastery |
| 24 | 52,900 | 432,400 | **Architect's Eye** | Seeing like a designer |
| 25 | 57,600 | 490,000 | **Guardian** | Protecting heritage |
| 26 | 62,500 | 552,500 | **Advocate** | Fighting for preservation |
| 27 | 67,600 | 620,100 | **Ambassador** | Spreading knowledge |
| 28 | 72,900 | 693,000 | **Luminary** | Shining light |
| 29 | 78,400 | 771,400 | **Visionary** | Seeing possibilities |
| 30 | 84,100 | 855,500 | **Legend** | Living legacy |

### Tier 4: Mythic (Levels 31-50+)
Elite tier for ultimate dedication

| Level | XP Required | Cumulative XP | Title | Theme |
|-------|-------------|---------------|-------|-------|
| 31 | 90,000 | 945,500 | **Mythmaker** | Creating narratives |
| 35 | 112,500 | 1,320,000 | **Monument** | Living landmark |
| 40 | 145,000 | 2,025,000 | **Pillar** | Foundation of community |
| 45 | 182,500 | 2,972,500 | **Oracle** | Wisdom keeper |
| 50 | 225,000 | 4,212,500 | **Immortal** | Eternal presence |

## Implementation Files

### 1. `/src/constants/xpLevels.ts`
```typescript
export interface LevelConfig {
  level: number;
  xpRequired: number;      // XP needed from previous level
  cumulativeXp: number;    // Total XP needed to reach this level
  title: string;
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
  description?: string;
}

export const XP_LEVELS: LevelConfig[] = [
  { level: 1, xpRequired: 0, cumulativeXp: 0, title: 'Newcomer', tier: 'explorer' },
  { level: 2, xpRequired: 100, cumulativeXp: 100, title: 'Observer', tier: 'explorer' },
  // ... (full array)
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

export function getXpForNextLevel(currentLevel: number): number {
  const nextLevel = XP_LEVELS.find(l => l.level === currentLevel + 1);
  return nextLevel ? nextLevel.xpRequired : Math.pow(currentLevel + 1, 2) * 100;
}

export function getProgressToNextLevel(currentXp: number): {
  currentLevel: number;
  nextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  const currentLevel = getLevelFromXp(currentXp);
  const currentLevelConfig = getLevelConfig(currentLevel);
  const nextLevelConfig = getLevelConfig(currentLevel + 1);

  const xpInCurrentLevel = currentXp - currentLevelConfig.cumulativeXp;
  const xpNeededForNext = nextLevelConfig.xpRequired;
  const progressPercent = (xpInCurrentLevel / xpNeededForNext) * 100;

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent: Math.min(progressPercent, 100),
  };
}
```

### 2. Database Schema Updates

Add to Supabase `profiles` table:
```sql
-- Add level title column
ALTER TABLE profiles
ADD COLUMN level_title TEXT DEFAULT 'Newcomer';

-- Update level_title when XP changes (via trigger or app logic)
CREATE OR REPLACE FUNCTION update_level_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level_title := (
    -- Calculate title based on level
    -- This would reference the level config
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Display Locations

### 1. Home Screen XP Card
- Current XP / Next Level XP
- Progress bar
- Current level & title
- "Tap for details" affordance

### 2. XP Detail Modal (already exists)
- Circular progress indicator
- Current level number
- XP stats (current, next level, required)
- Streak info with multiplier
- Progress bar

### 3. Passport/Profile Screen
- Large level badge
- **Level Title** prominently displayed
- Total XP accumulated
- Level history/milestones

### 4. Post-Scan Feedback
```
+20 XP
🏛️ New Building Scanned!

Total: 5,234 XP
Level 6 - Admirer
```

## XP Award Sources (Updated)

Update `awardXp()` calls throughout app:

```typescript
// Building scan
await questsActions.awardXp({
  amount: 20,
  source: 'building_scan',  // Triggers streak update
  userId: session.user.id,
});

// Photo contribution
await questsActions.awardXp({
  amount: 10 * photoCount,
  source: 'photo_contribution',  // Does NOT trigger streak
  userId: session.user.id,
});

// Full contribution
await questsActions.awardXp({
  amount: 35,
  source: 'building_contribution',  // Does NOT trigger streak
  userId: session.user.id,
});

// Quest completion
await questsActions.awardXp({
  amount: quest.xpReward,
  source: 'quest_completion',  // Triggers streak update
  userId: session.user.id,
});
```

## Future Enhancements

1. **Level-Up Celebration Animation**
   - Confetti effect
   - New title reveal
   - Share to social media option

2. **Level Badges**
   - Unique icon for each tier
   - Display in profile
   - Shareable achievements

3. **Leaderboards**
   - Top users by level
   - Weekly XP gainers
   - Neighborhood rankings

4. **Level-Based Unlocks**
   - Special quests at Level 10, 20, 30
   - Early access to new features
   - Exclusive stamps/badges
