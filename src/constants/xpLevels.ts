/**
 * XP & Level System
 *
 * Defines the complete progression system with 50 levels across 4 tiers.
 * Levels provide identity and recognition for user dedication.
 *
 * Tiers:
 * - Explorer (1-10): Learning the basics
 * - Connoisseur (11-20): Deep appreciation
 * - Authority (21-30): Mastery and contribution
 * - Mythic (31-50+): Elite dedication
 */

export interface LevelConfig {
  level: number;
  xpRequired: number;      // XP needed from previous level to reach this level
  cumulativeXp: number;    // Total XP needed from level 1 to reach this level
  title: string;           // Level title (e.g., "Wanderer", "Curator")
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
}

export const XP_LEVELS: LevelConfig[] = [
  // TIER 1: EXPLORER (Levels 1-10) - Learning the basics
  { level: 1, xpRequired: 0, cumulativeXp: 0, title: 'Newcomer', tier: 'explorer' },
  { level: 2, xpRequired: 100, cumulativeXp: 100, title: 'Observer', tier: 'explorer' },
  { level: 3, xpRequired: 400, cumulativeXp: 500, title: 'Wanderer', tier: 'explorer' },
  { level: 4, xpRequired: 900, cumulativeXp: 1400, title: 'Scout', tier: 'explorer' },
  { level: 5, xpRequired: 1600, cumulativeXp: 3000, title: 'Enthusiast', tier: 'explorer' },
  { level: 6, xpRequired: 2500, cumulativeXp: 5500, title: 'Admirer', tier: 'explorer' },
  { level: 7, xpRequired: 3600, cumulativeXp: 9100, title: 'Student', tier: 'explorer' },
  { level: 8, xpRequired: 4900, cumulativeXp: 14000, title: 'Apprentice', tier: 'explorer' },
  { level: 9, xpRequired: 6400, cumulativeXp: 20400, title: 'Explorer', tier: 'explorer' },
  { level: 10, xpRequired: 8100, cumulativeXp: 28500, title: 'Pathfinder', tier: 'explorer' },

  // TIER 2: CONNOISSEUR (Levels 11-20) - Deep appreciation
  { level: 11, xpRequired: 10000, cumulativeXp: 38500, title: 'Connoisseur', tier: 'connoisseur' },
  { level: 12, xpRequired: 12100, cumulativeXp: 50600, title: 'Specialist', tier: 'connoisseur' },
  { level: 13, xpRequired: 14400, cumulativeXp: 65000, title: 'Researcher', tier: 'connoisseur' },
  { level: 14, xpRequired: 16900, cumulativeXp: 81900, title: 'Documentarian', tier: 'connoisseur' },
  { level: 15, xpRequired: 19600, cumulativeXp: 101500, title: 'Chronicler', tier: 'connoisseur' },
  { level: 16, xpRequired: 22500, cumulativeXp: 124000, title: 'Curator', tier: 'connoisseur' },
  { level: 17, xpRequired: 25600, cumulativeXp: 149600, title: 'Scholar', tier: 'connoisseur' },
  { level: 18, xpRequired: 28900, cumulativeXp: 178500, title: 'Expert', tier: 'connoisseur' },
  { level: 19, xpRequired: 32400, cumulativeXp: 210900, title: 'Archivist', tier: 'connoisseur' },
  { level: 20, xpRequired: 36100, cumulativeXp: 247000, title: 'Historian', tier: 'connoisseur' },

  // TIER 3: AUTHORITY (Levels 21-30) - Mastery and contribution
  { level: 21, xpRequired: 40000, cumulativeXp: 287000, title: 'Authority', tier: 'authority' },
  { level: 22, xpRequired: 44100, cumulativeXp: 331100, title: 'Mentor', tier: 'authority' },
  { level: 23, xpRequired: 48400, cumulativeXp: 379500, title: 'Master', tier: 'authority' },
  { level: 24, xpRequired: 52900, cumulativeXp: 432400, title: "Architect's Eye", tier: 'authority' },
  { level: 25, xpRequired: 57600, cumulativeXp: 490000, title: 'Guardian', tier: 'authority' },
  { level: 26, xpRequired: 62500, cumulativeXp: 552500, title: 'Advocate', tier: 'authority' },
  { level: 27, xpRequired: 67600, cumulativeXp: 620100, title: 'Ambassador', tier: 'authority' },
  { level: 28, xpRequired: 72900, cumulativeXp: 693000, title: 'Luminary', tier: 'authority' },
  { level: 29, xpRequired: 78400, cumulativeXp: 771400, title: 'Visionary', tier: 'authority' },
  { level: 30, xpRequired: 84100, cumulativeXp: 855500, title: 'Legend', tier: 'authority' },

  // TIER 4: MYTHIC (Levels 31-50+) - Elite dedication
  { level: 31, xpRequired: 90000, cumulativeXp: 945500, title: 'Mythmaker', tier: 'mythic' },
  { level: 32, xpRequired: 96100, cumulativeXp: 1041600, title: 'Iconoclast', tier: 'mythic' },
  { level: 33, xpRequired: 102400, cumulativeXp: 1144000, title: 'Vanguard', tier: 'mythic' },
  { level: 34, xpRequired: 108900, cumulativeXp: 1252900, title: 'Paragon', tier: 'mythic' },
  { level: 35, xpRequired: 115600, cumulativeXp: 1368500, title: 'Monument', tier: 'mythic' },
  { level: 36, xpRequired: 122500, cumulativeXp: 1491000, title: 'Touchstone', tier: 'mythic' },
  { level: 37, xpRequired: 129600, cumulativeXp: 1620600, title: 'Keystone', tier: 'mythic' },
  { level: 38, xpRequired: 136900, cumulativeXp: 1757500, title: 'Cornerstone', tier: 'mythic' },
  { level: 39, xpRequired: 144400, cumulativeXp: 1901900, title: 'Foundation', tier: 'mythic' },
  { level: 40, xpRequired: 152100, cumulativeXp: 2054000, title: 'Pillar', tier: 'mythic' },
  { level: 41, xpRequired: 160000, cumulativeXp: 2214000, title: 'Bedrock', tier: 'mythic' },
  { level: 42, xpRequired: 168100, cumulativeXp: 2382100, title: 'Eternal', tier: 'mythic' },
  { level: 43, xpRequired: 176400, cumulativeXp: 2558500, title: 'Timeless', tier: 'mythic' },
  { level: 44, xpRequired: 184900, cumulativeXp: 2743400, title: 'Ageless', tier: 'mythic' },
  { level: 45, xpRequired: 193600, cumulativeXp: 2937000, title: 'Oracle', tier: 'mythic' },
  { level: 46, xpRequired: 202500, cumulativeXp: 3139500, title: 'Sage', tier: 'mythic' },
  { level: 47, xpRequired: 211600, cumulativeXp: 3351100, title: 'Seer', tier: 'mythic' },
  { level: 48, xpRequired: 220900, cumulativeXp: 3572000, title: 'Prophet', tier: 'mythic' },
  { level: 49, xpRequired: 230400, cumulativeXp: 3802400, title: 'Deity', tier: 'mythic' },
  { level: 50, xpRequired: 240100, cumulativeXp: 4042500, title: 'Immortal', tier: 'mythic' },
];

/**
 * Get level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    return 1;
  }

  // Find the highest level the user has reached
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= XP_LEVELS[i].cumulativeXp) {
      return XP_LEVELS[i].level;
    }
  }

  return 1;
}

/**
 * Get level configuration for a specific level
 */
export function getLevelConfig(level: number): LevelConfig {
  const config = XP_LEVELS.find(l => l.level === level);
  if (!config) {
    // Return max level if level is beyond our defined range
    if (level > XP_LEVELS[XP_LEVELS.length - 1].level) {
      return XP_LEVELS[XP_LEVELS.length - 1];
    }
    // Return level 1 if invalid
    return XP_LEVELS[0];
  }
  return config;
}

/**
 * Get XP required to reach next level
 * Used for progress bars and UI display
 */
export function getXpForNextLevel(currentLevel: number): number {
  const nextLevelConfig = getLevelConfig(currentLevel + 1);
  return nextLevelConfig.xpRequired;
}

/**
 * Get complete progress information for current level
 */
export function getProgressToNextLevel(currentXp: number): {
  currentLevel: number;
  currentLevelTitle: string;
  currentLevelTier: string;
  nextLevel: number;
  nextLevelTitle: string;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
  tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
} {
  const currentLevel = getLevelFromXp(currentXp);
  const currentLevelConfig = getLevelConfig(currentLevel);
  const nextLevelConfig = getLevelConfig(currentLevel + 1);

  const xpInCurrentLevel = currentXp - currentLevelConfig.cumulativeXp;
  const xpNeededForNext = nextLevelConfig.xpRequired;
  const progressPercent = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 0;

  return {
    currentLevel,
    currentLevelTitle: currentLevelConfig.title,
    currentLevelTier: currentLevelConfig.tier,
    nextLevel: nextLevelConfig.level,
    nextLevelTitle: nextLevelConfig.title,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent: Math.min(Math.max(progressPercent, 0), 100),
    tier: currentLevelConfig.tier,
  };
}

/**
 * Check if user leveled up after gaining XP
 */
export function checkLevelUp(oldXp: number, newXp: number): {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
} {
  const oldLevel = getLevelFromXp(oldXp);
  const newLevel = getLevelFromXp(newXp);
  const leveledUp = newLevel > oldLevel;

  return {
    leveledUp,
    oldLevel,
    newLevel,
    newTitle: getLevelConfig(newLevel).title,
  };
}

/**
 * Get tier color for UI styling
 */
export function getTierColor(tier: 'explorer' | 'connoisseur' | 'authority' | 'mythic'): string {
  switch (tier) {
    case 'explorer':
      return '#10b981'; // Green
    case 'connoisseur':
      return '#3b82f6'; // Blue
    case 'authority':
      return '#a855f7'; // Purple
    case 'mythic':
      return '#f59e0b'; // Gold
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Legacy compatibility - clamp progress between 0 and 1
 */
export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress) || progress < 0) {
    return 0;
  }
  if (progress > 1) {
    return 1;
  }
  return progress;
}
