/**
 * Quest Timer Utilities
 * Handles time calculations for daily (resets at midnight) and weekly (resets Monday 00:00) quests
 */

/**
 * Get time remaining until midnight (daily quest reset)
 * @returns {Object} { hours, minutes, seconds, totalSeconds }
 */
export const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight

  const diff = midnight - now;
  const totalSeconds = Math.floor(diff / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: `${hours}h ${minutes}m ${seconds}s`,
  };
};

/**
 * Get time remaining until next Monday at 00:00 (weekly quest reset)
 * @returns {Object} { days, hours, minutes, seconds, totalSeconds }
 */
export const getTimeUntilMonday = () => {
  const now = new Date();
  const nextMonday = new Date(now);

  // Get next Monday
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // If Sunday, 1 day; else 8-dayOfWeek

  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = nextMonday - now;
  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m ${seconds}s`,
  };
};

/**
 * Format time remaining in a human-readable way
 * @param {Object} timeObj - Object with days, hours, minutes, seconds
 * @returns {string} Formatted string
 */
export const formatTimeRemaining = ({ days, hours, minutes, seconds }) => {
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};
