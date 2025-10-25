export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
}

const roundToSeconds = (ms: number): number => Math.max(0, Math.floor(ms / 1000));

/**
 * Get time remaining until midnight (daily quest reset).
 */
export const getTimeUntilMidnight = (): TimeRemaining => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight

  const diff = midnight.getTime() - now.getTime();
  const totalSeconds = roundToSeconds(diff);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: 0,
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: `${hours}h ${minutes}m ${seconds}s`,
  };
};

/**
 * Get time remaining until next Monday at 00:00 (weekly quest reset).
 */
export const getTimeUntilMonday = (): TimeRemaining => {
  const now = new Date();
  const nextMonday = new Date(now);

  // Get next Monday
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // If Sunday, 1 day; else 8-dayOfWeek

  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = nextMonday.getTime() - now.getTime();
  const totalSeconds = roundToSeconds(diff);

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
 * Format time remaining in a human-readable way.
 */
export const formatTimeRemaining = ({
  days,
  hours,
  minutes,
  seconds,
}: Pick<TimeRemaining, "days" | "hours" | "minutes" | "seconds">): string => {
  if (days && days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};
