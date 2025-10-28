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

export type PassportUiData = {
  passportNumber: string;
  issueDateLabel: string | null;
  xpTotal: number;
  level: number;
  xpForNextLevel: number;
  xpProgress: number;
  stamps: PassportUiStamp[];
  achievements: PassportUiAchievement[];
  lists: PassportUiList[];
};

type BuildPassportParams = {
  user: PassportUser;
  snapshot: PassportSnapshot;
};

export function toPassportUi({ user, snapshot }: BuildPassportParams): PassportUiData {
  const passportNumber = formatPassportNumber(user.id);
  const issueDateLabel = formatIssueDate(user.created_at);
  const xpForNextLevel = getXpForNextLevel(snapshot.level);
  const xpProgress = clampProgress(xpForNextLevel > 0 ? snapshot.xpTotal / xpForNextLevel : 0);

  return {
    passportNumber,
    issueDateLabel,
    xpTotal: snapshot.xpTotal,
    level: snapshot.level,
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
  };
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
