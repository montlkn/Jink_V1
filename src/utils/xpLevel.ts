/**
 * XP Level utilities
 *
 * This file now re-exports from the comprehensive xpLevels constants.
 * Maintained for backwards compatibility with existing code.
 */

export {
  getLevelFromXp,
  getLevelConfig,
  getXpForNextLevel,
  getProgressToNextLevel,
  checkLevelUp,
  getTierColor,
  clampProgress,
  type LevelConfig,
} from '@/constants/xpLevels';
