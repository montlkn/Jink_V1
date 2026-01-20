/**
 * Design Tokens - Single source of truth for all design values
 *
 * Import from here instead of individual files for consistency:
 * import { theme, SPACING, TYPOGRAPHY, COLORS, BUTTON_SIZES } from '@/theme/tokens';
 */

// Re-export theme
export { DESIGNER_REPUBLIC_THEME as theme } from './designer_republic';

// Re-export all design constants
export {
  CARD_STYLES,
  TYPOGRAPHY,
  SPACING,
  BUTTON_SIZES,
  ICON_SIZES,
  HEADER_HEIGHTS,
  MODAL_SIZES,
  BORDERS,
  BORDER_RADIUS,
  SHADOWS,
  COLORS,
  STREAK_CONFIG,
  getStreakMultiplier,
} from './designConstants';
