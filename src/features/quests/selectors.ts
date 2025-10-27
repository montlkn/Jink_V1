export type QuestReward = {
  type: "stamp" | "achievement";
  icon: "bookmark" | "ribbon";
  label: string;
};

export type QuestItem = {
  id: string | null;
  type: "daily" | "weekly";
  questType: string | null;
  title: string | null;
  description: string | null;
  xpReward: number;
  additionalRewards: QuestReward[];
  progress: number;
  total: number;
  completed: boolean;
};

export type QuestCollection = {
  daily: QuestItem | null;
  weekly: QuestItem | null;
  items: QuestItem[];
  activeCount: number;
};

export type XpSnapshot = {
  xp: number;
  level: number;
  xpSpent: number;
  xpForNextLevel: number;
};

export type QuestGatewayPayload = {
  id?: string | null;
  quest_id?: string | null;
  type?: string | null;
  quest_type?: string | null;
  title?: string | null;
  description?: string | null;
  xp_reward?: number | null;
  ep_reward?: number | null;
  rewards?: unknown;
  target_count?: number | null;
  progress?: number | null;
  completed?: boolean | null;
};

export type XpGatewayPayload = {
  xp?: number | null;
  ep?: number | null;
  level?: number | null;
  xp_spent?: number | null;
  ep_spent?: number | null;
};

export const EMPTY_QUEST_COLLECTION: QuestCollection = {
  daily: null,
  weekly: null,
  items: [],
  activeCount: 0,
};

const safeNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const safeString = (value: unknown): string | null =>
  typeof value === "string" && value.length ? value : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const mapRewards = (raw: unknown): QuestReward[] => {
  if (!isRecord(raw)) {
    return [];
  }

  const rewards = raw.rewards;
  if (!isRecord(rewards)) {
    return [];
  }

  const items: QuestReward[] = [];
  const stamps = (rewards as any).stamps;
  if (Array.isArray(stamps)) {
    stamps.forEach((stamp) => {
      if (typeof stamp === "string" && stamp.length) {
        items.push({ type: "stamp", icon: "bookmark", label: stamp });
      }
    });
  }

  const achievements = (rewards as any).achievements;
  if (Array.isArray(achievements)) {
    achievements.forEach((achievement) => {
      if (typeof achievement === "string" && achievement.length) {
        items.push({ type: "achievement", icon: "ribbon", label: achievement });
      }
    });
  }

  return items;
};

const pickQuestId = (raw: QuestGatewayPayload): string | null =>
  safeString(raw.id) ?? safeString((raw as any).quest_id);

export const getXpForNextLevel = (currentLevel: number): number =>
  Math.pow(Math.max(1, currentLevel), 2) * 100;

export function toQuestItem(
  raw: unknown,
  type: "daily" | "weekly"
): QuestItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const source = raw as QuestGatewayPayload;

  return {
    id: pickQuestId(source),
    type,
    questType: safeString(source.quest_type),
    title: safeString(source.title),
    description: safeString(source.description),
    xpReward: safeNumber(source.xp_reward ?? source.ep_reward, 0),
    additionalRewards: mapRewards(source),
    progress: safeNumber(source.progress, 0),
    total: safeNumber(source.target_count, 0),
    completed: Boolean(source.completed),
  };
}

export function toQuestCollection(
  payload: { daily?: unknown; weekly?: unknown } | null | undefined
): QuestCollection {
  const daily = payload?.daily ? toQuestItem(payload.daily, "daily") : null;
  const weekly = payload?.weekly ? toQuestItem(payload.weekly, "weekly") : null;
  const items = [daily, weekly].filter(Boolean) as QuestItem[];

  return {
    daily,
    weekly,
    items,
    activeCount: items.length,
  };
}

export function toXpSnapshot(raw: unknown): XpSnapshot {
  if (!isRecord(raw)) {
    return {
      xp: 0,
      level: 1,
      xpSpent: 0,
      xpForNextLevel: getXpForNextLevel(1),
    };
  }

  const source = raw as XpGatewayPayload;
  const xpValue = safeNumber(source.xp ?? source.ep, 0);
  const levelValue = Math.max(1, safeNumber(source.level, 1));
  const xpSpentValue = safeNumber(source.xp_spent ?? source.ep_spent, 0);

  return {
    xp: xpValue,
    level: levelValue,
    xpSpent: xpSpentValue,
    xpForNextLevel: getXpForNextLevel(levelValue),
  };
}
