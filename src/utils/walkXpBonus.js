import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';

/**
 * Calculate XP multiplier for walk duration
 * Based on time tiers that correlate to optimal exploration durations
 */

/**
 * Get walk duration XP multiplier and corresponding color
 * @param {number} minutes - Walk duration in minutes
 * @returns {{ multiplier: number, color: string, tier: string }}
 */
export const getWalkDurationBonus = (minutes) => {
  // Colors extracted from timeslider.png zones
  const COLORS = {
    RED: APP_COLORS.error,      // Red - 2.0x multiplier zones
    ORANGE: APP_COLORS.warning,  // Orange - 1.2x multiplier zones
    BLACK: theme.colors.black,   // Black - no bonus zones (1.0x)
    GREEN: APP_COLORS.success,   // Green - 1.5x multiplier zones
  };

  // Time-based multiplier tiers
  if (minutes >= 5 && minutes <= 10) {
    return { multiplier: 1.0, color: COLORS.BLACK, tier: 'none' };
  }
  if (minutes >= 10 && minutes < 15) {
    return { multiplier: 1.2, color: COLORS.ORANGE, tier: 'low' };
  }
  if (minutes >= 15 && minutes < 25) {
    return { multiplier: 1.5, color: COLORS.GREEN, tier: 'medium' };
  }
  if (minutes >= 25 && minutes < 40) {
    return { multiplier: 2.0, color: COLORS.RED, tier: 'high' };
  }
  if (minutes >= 40 && minutes < 50) {
    return { multiplier: 1.2, color: COLORS.ORANGE, tier: 'low' };
  }
  if (minutes >= 50 && minutes < 60) {
    return { multiplier: 1.5, color: COLORS.GREEN, tier: 'medium' };
  }
  if (minutes >= 60 && minutes < 70) {
    return { multiplier: 2.0, color: COLORS.RED, tier: 'high' };
  }
  if (minutes >= 70 && minutes < 80) {
    return { multiplier: 1.5, color: COLORS.GREEN, tier: 'medium' };
  }
  if (minutes >= 80 && minutes < 85) {
    return { multiplier: 1.2, color: COLORS.ORANGE, tier: 'low' };
  }
  if (minutes >= 85 && minutes <= 90) {
    return { multiplier: 1.0, color: COLORS.BLACK, tier: 'none' };
  }
  if (minutes > 90 && minutes <= 95) {
    return { multiplier: 2.0, color: COLORS.RED, tier: 'high' };
  }

  // Default fallback
  return { multiplier: 1.0, color: COLORS.BLACK, tier: 'none' };
};
