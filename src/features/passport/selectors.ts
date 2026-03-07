import type { PassportSnapshot } from "@/services/gateways/passportGateway";
import { clampProgress, getXpForNextLevel } from "@/utils/xpLevel";

type PassportUser = {
  id: string;
  created_at?: string | null;
};

type PassportUiStamp = {
  id: string;
  name: string;
};

type PassportUiAchievement = {
  id: string;
  name: string;
};

type PassportUiList = {
  id: string;
  name: string;
};

type PassportUiWalk = {
  id: string;
  date: string; // formatted as MM.DD.YY
  duration: string; // formatted as HH:MM
  buildingCount: number;
  style: string; // dominant style or borough
};

export type PassportUiData = {
  passportNumber: string;
  issueDateLabel: string | null;
  xpTotal: number;
  level: number;
  levelTitle?: string;
  levelTier?: string;
  xpForNextLevel: number;
  xpProgress: number;
  stamps: PassportUiStamp[];
  achievements: PassportUiAchievement[];
  lists: PassportUiList[];
  walks: PassportUiWalk[];
  dailyStreak: number;
  streakMultiplier: number;
  totalBuildingsScanned: number;
  stampCount: number;
  achievementCount: number;
  visaCount: number;
};

type BuildPassportParams = {
  user: PassportUser;
  snapshot: PassportSnapshot;
  walks?: {
    id: string;
    startedAt: string;
    endedAt: string;
    dominantStyle?: string;
    borough?: string;
    buildingCount?: number;
    customLabel?: string;
  }[];
};

export function toPassportUi(
  { user, snapshot, walks = [] }: BuildPassportParams,
): PassportUiData {
  const passportNumber = formatPassportNumber(user.id);
  const issueDateLabel = formatIssueDate(user.created_at);
  const xpForNextLevel = getXpForNextLevel(snapshot.level);
  const xpProgress = clampProgress(
    xpForNextLevel > 0 ? snapshot.xpTotal / xpForNextLevel : 0,
  );

  const dailyStreak = snapshot.dailyStreak ?? 0;
  const streakMultiplier = getStreakMultiplierLocal(dailyStreak);

  // Process walks data
  const processedWalks = walks.slice(0, 5).map((walk) => {
    const date = formatWalkDate(walk.startedAt);
    const duration = formatWalkDuration(walk.startedAt, walk.endedAt);
    const buildingCount = walk.buildingCount ?? 0;

    // Priority: customLabel > dominantStyle > borough > 'UNKNOWN'
    const style = walk.customLabel || walk.dominantStyle || walk.borough ||
      "UNKNOWN";

    return {
      id: walk.id,
      date,
      duration,
      buildingCount: Number.isFinite(buildingCount) ? buildingCount : 0,
      style: style.toUpperCase(),
    };
  });

  return {
    passportNumber,
    issueDateLabel,
    xpTotal: snapshot.xpTotal,
    level: snapshot.level,
    levelTitle: snapshot.levelTitle,
    levelTier: snapshot.levelTier,
    xpForNextLevel,
    xpProgress,
    stamps: snapshot.stamps.map((name, index) => ({
      id: `${index}`,
      name,
    })),
    achievements: snapshot.achievements.map((name, index) => ({
      id: `${index}`,
      name,
    })),
    lists: snapshot.lists,
    walks: processedWalks,
    dailyStreak,
    streakMultiplier,
    totalBuildingsScanned: snapshot.totalBuildingsScanned || 0,
    stampCount: snapshot.stampCount,
    achievementCount: snapshot.achievementCount,
    visaCount: snapshot.visaCount,
  };
}

function getStreakMultiplierLocal(streakCount: number): number {
  if (streakCount >= 30) return 3.0;
  if (streakCount >= 7) return 2.0;
  if (streakCount >= 3) return 1.5;
  return 1.0;
}

function formatPassportNumber(userId: string): string {
  if (!userId) {
    return "AR-0000-0000";
  }
  const raw = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length < 8) {
    return "AR-0000-0000";
  }
  const first = raw.slice(0, 4);
  const second = raw.slice(4, 8);
  return `AR-${first}-${second}`;
}

function formatIssueDate(createdAt?: string | null): string | null {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function formatWalkDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "00.00.00";
    }

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return `${month}.${day}.${year}`;
  } catch {
    return "00.00.00";
  }
}

function formatWalkDuration(
  startDateString: string,
  endDateString: string,
): string {
  try {
    // Handle missing dates
    if (!startDateString || !endDateString) {
      return "00:00";
    }

    const start = new Date(startDateString);
    const end = new Date(endDateString);

    // Validate dates
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "00:00";
    }

    const durationMs = end.getTime() - start.getTime();

    // If duration is negative or unreasonably long (> 24 hours), return 00:00
    if (durationMs < 0 || durationMs > 86400000) {
      console.warn(
        `[formatWalkDuration] Invalid duration: ${durationMs}ms for dates ${startDateString} -> ${endDateString}`,
      );
      return "00:00";
    }

    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${
      String(minutes).padStart(2, "0")
    }`;
  } catch (error) {
    console.warn(`[formatWalkDuration] Error formatting duration:`, error);
    return "00:00";
  }
}
