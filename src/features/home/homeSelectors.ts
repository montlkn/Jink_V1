type PrimitiveRecord = Record<string, unknown>;

type HomeQuestReward = {
  type: "stamp" | "achievement";
  icon: "bookmark" | "ribbon";
  label: string;
};

export type HomeQuest = {
  id: string | null;
  type: "daily" | "weekly";
  questType: string | null;
  title: string | null;
  description: string | null;
  xpReward: number;
  additionalRewards: HomeQuestReward[];
  progress: number;
  total: number;
  completed: boolean;
};

export type HomeQuestSet = {
  daily: HomeQuest | null;
  weekly: HomeQuest | null;
  items: HomeQuest[];
  activeCount: number;
};

export const EMPTY_HOME_QUESTS: HomeQuestSet = {
  daily: null,
  weekly: null,
  items: [],
  activeCount: 0,
};

const isRecord = (value: unknown): value is PrimitiveRecord =>
  typeof value === "object" && value !== null;

const safeNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const safeString = (value: unknown) =>
  typeof value === "string" && value.length ? value : null;

const mapRewards = (raw: PrimitiveRecord | null | undefined): HomeQuestReward[] => {
  if (!raw) {
    return [];
  }

  const rewards = isRecord(raw.rewards) ? (raw.rewards as PrimitiveRecord) : null;
  if (!rewards) {
    return [];
  }

  const results: HomeQuestReward[] = [];

  const stamps = (rewards as any)?.stamps;
  if (Array.isArray(stamps)) {
    stamps.forEach((stamp) => {
      if (typeof stamp === "string" && stamp.length) {
        results.push({
          type: "stamp",
          icon: "bookmark",
          label: stamp,
        });
      }
    });
  }

  const achievements = (rewards as any)?.achievements;
  if (Array.isArray(achievements)) {
    achievements.forEach((achievement) => {
      if (typeof achievement === "string" && achievement.length) {
        results.push({
          type: "achievement",
          icon: "ribbon",
          label: achievement,
        });
      }
    });
  }

  return results;
};

const toHomeQuest = (
  raw: unknown,
  type: "daily" | "weekly"
): HomeQuest | null => {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    id: safeString(raw.id) ?? safeString((raw as PrimitiveRecord).quest_id),
    type,
    questType: safeString(raw.quest_type),
    title: safeString(raw.title),
    description: safeString(raw.description),
    xpReward: safeNumber((raw as any)?.xp_reward ?? (raw as any)?.ep_reward, 0),
    additionalRewards: mapRewards(raw),
    progress: safeNumber(raw.progress, 0),
    total: safeNumber((raw as any)?.target_count, 0),
    completed: Boolean(raw.completed),
  };
};

export function toUiProfile(raw: unknown) {
  const profile = isRecord(raw) ? raw : {};
  const name =
    safeString(profile.name) ??
    safeString((profile as any)?.full_name) ??
    safeString((profile as any)?.username) ??
    "Unknown";

  return {
    name,
  };
}

export function toUiTaste(raw: unknown) {
  const source = isRecord(raw) ? raw : {};
  const text = safeString(source.text) ?? "";
  const title = safeString(source.title) ?? (text || "No summary");

  return {
    title,
    text,
  };
}

type QuestInput = {
  daily?: unknown;
  weekly?: unknown;
};

export function toUiQuests(input: QuestInput | null | undefined): HomeQuestSet {
  const daily = input?.daily ? toHomeQuest(input.daily, "daily") : null;
  const weekly = input?.weekly ? toHomeQuest(input.weekly, "weekly") : null;
  const items = [daily, weekly].filter(Boolean) as HomeQuest[];

  return {
    daily,
    weekly,
    items,
    activeCount: items.length,
  };
}
