export type DailyTimer = {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
};

export type WeeklyTimer = DailyTimer & {
  days: number;
};

export const getTimeUntilMidnight = (): DailyTimer => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diff = midnight.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

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

export const getTimeUntilMonday = (): WeeklyTimer => {
  const now = new Date();
  const nextMonday = new Date(now);

  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = nextMonday.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

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
    formatted:
      days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`,
  };
};

type TimeRemainingInput = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export const formatTimeRemaining = ({
  days,
  hours,
  minutes,
  seconds,
}: TimeRemainingInput): string => {
  if (days > 0) {
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
