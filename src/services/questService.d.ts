export type ActiveQuestsResponse = {
  daily: unknown;
  weekly: unknown;
};

export type XpSnapshot = {
  ep: number;
  level: number;
  epSpent: number;
  xp?: number | null;
  xpSpent?: number | null;
};

export declare function getActiveQuests(): Promise<ActiveQuestsResponse>;
export declare function getUserXP(): Promise<XpSnapshot>;
export declare function getXPForNextLevel(currentLevel: number): number;
export declare function getActiveDailyQuest(): Promise<unknown>;
export declare function getActiveWeeklyQuest(): Promise<unknown>;
export declare function updateQuestProgress(
  questType: string,
  increment?: number
): Promise<boolean>;
export declare function awardXP(amount: number, source?: string): Promise<boolean>;
export declare const getUserEP: typeof getUserXP;
export declare const getEPForNextLevel: typeof getXPForNextLevel;
export declare function getUserStamps(): Promise<string[]>;
export declare function getUserAchievements(): Promise<string[]>;
