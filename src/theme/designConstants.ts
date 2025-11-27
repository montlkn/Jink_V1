/**
 * Centralized design constants for the application
 * Use these constants to maintain consistency across all UI elements
 */

import { ELEMENT_COLORS } from "@/constants/elementColors";
import { DESIGNER_REPUBLIC_THEME } from "./designer_republic";

/**
 * Card styles used throughout the app
 */
export const CARD_STYLES = {
  borderWidth: 2,
  borderRadius: 0,
  padding: 16,
} as const;

/**
 * Typography constants
 */
export const TYPOGRAPHY = {
  sizes: {
    tiny: 8,
    small: 10,
    body: 12,
    medium: 14,
    large: 16,
    title: 18,
    heading: 20,
    hero: 24,
    massive: 28,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  letterSpacing: {
    tight: 0.5,
    normal: 1,
    wide: 2,
  },
} as const;

/**
 * Spacing constants (multiples of 4)
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/**
 * Button and interactive element sizes
 */
export const BUTTON_SIZES = {} as const;

/**
 * Modal sizes
 */
export const MODAL_SIZES = {
  small: {
    width: "70%",
    maxHeight: "60%",
  },
  medium: {
    width: "80%",
    maxHeight: "70%",
  },
  large: {
    width: "90%",
    maxHeight: "80%",
  },
} as const;

/**
 * Border widths
 */
export const BORDERS = {
  thin: 1,
  medium: 2,
  thick: 4,
} as const;

/**
 * Common elevation/shadow styles
 */
export const SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Color palette - re-export for convenience
 */
export const COLORS = {
  theme: DESIGNER_REPUBLIC_THEME.colors,
  elements: ELEMENT_COLORS,
} as const;

/**
 * Streak multiplier thresholds and colors
 */
export const STREAK_CONFIG = {
  thresholds: {
    base: { min: 0, multiplier: 1.0, color: ELEMENT_COLORS.streak.inactive },
    bronze: { min: 3, multiplier: 1.5, color: ELEMENT_COLORS.streak.active },
    silver: { min: 7, multiplier: 2.0, color: ELEMENT_COLORS.streak.active },
    gold: { min: 30, multiplier: 3.0, color: ELEMENT_COLORS.streak.multiplier },
  },
} as const;

/**
 * Helper function to get streak info
 */
export function getStreakMultiplier(streakCount: number) {
  const config = STREAK_CONFIG.thresholds;

  if (streakCount >= config.gold.min) {
    return {
      multiplier: `${config.gold.multiplier}x`,
      color: config.gold.color,
    };
  }
  if (streakCount >= config.silver.min) {
    return {
      multiplier: `${config.silver.multiplier}x`,
      color: config.silver.color,
    };
  }
  if (streakCount >= config.bronze.min) {
    return {
      multiplier: `${config.bronze.multiplier}x`,
      color: config.bronze.color,
    };
  }
  return { multiplier: `${config.base.multiplier}x`, color: config.base.color };
}
