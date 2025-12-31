import { fetchXpSummary, supabaseGateway as supabase } from "./supabaseGateway";

type ProfileRow = {
  stamps: string[];
  achievements: string[];
  daily_streak_count?: number;
  last_activity_date?: string;
};

export type StreakUpdate = {
  streak_count: number;
  is_new_day: boolean;
  previous_streak: number;
};

export type PassportList = {
  id: string;
  name: string;
};

export type PassportSnapshot = {
  xpTotal: number;
  level: number;
  xpSpent: number;
  stamps: string[];
  achievements: string[];
  lists: PassportList[];
  dailyStreak: number;
  lastActivityDate?: string;
  totalBuildingsScanned: number;
  stampCount: number;
  achievementCount: number;
  visaCount: number;
};

export async function fetchPassportProfile(
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("stamps, achievements, daily_streak_count, last_activity_date")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const stamps = Array.isArray(data?.stamps) ? data.stamps : [];
  const achievements = Array.isArray(data?.achievements)
    ? data.achievements
    : [];

  return {
    stamps,
    achievements,
    daily_streak_count: data?.daily_streak_count ?? 0,
    last_activity_date: data?.last_activity_date,
  };
}

export async function fetchPassport(userId: string): Promise<PassportSnapshot> {
  const [profile, xpSnapshot] = await Promise.all([
    fetchPassportProfile(userId),
    fetchXpSummary(userId),
  ]);

  const xpTotal = xpSnapshot?.xp ?? 0;
  const level = xpSnapshot?.level ?? 1;
  const xpSpent = xpSnapshot?.xpSpent ?? 0;

  // Fetch scanned buildings count from AsyncStorage
  let totalBuildingsScanned = 0;
  try {
    const AsyncStorage =
      (await import("@react-native-async-storage/async-storage")).default;
    const scannedBuildingsJson = await AsyncStorage.getItem(
      "@scanned_buildings",
    );
    if (scannedBuildingsJson) {
      const scannedList = JSON.parse(scannedBuildingsJson);
      totalBuildingsScanned = Array.isArray(scannedList)
        ? scannedList.length
        : 0;
    }
  } catch (error) {
    console.warn(
      "[passportGateway] Failed to fetch scanned buildings count",
      error,
    );
  }

  // Fetch real counts from database tables
  let stampCount = 0;
  let achievementCount = 0;
  let visaCount = 0;

  try {
    const [stampsResult, achievementsResult, visasResult] = await Promise.all([
      supabase.from('user_stamps').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_achievements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_visas').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    stampCount = stampsResult.count ?? 0;
    achievementCount = achievementsResult.count ?? 0;
    visaCount = visasResult.count ?? 0;
  } catch (error) {
    console.warn('[passportGateway] Failed to fetch real counts', error);
  }

  return {
    xpTotal,
    level,
    xpSpent,
    stamps: profile.stamps,
    achievements: profile.achievements,
    lists: [],
    dailyStreak: profile.daily_streak_count ?? 0,
    lastActivityDate: profile.last_activity_date,
    totalBuildingsScanned,
    stampCount,
    achievementCount,
    visaCount,
  };
}

export async function fetchPassportStamps(userId: string): Promise<string[]> {
  const profile = await fetchPassportProfile(userId);
  return profile.stamps;
}

export async function fetchPassportAchievements(
  userId: string,
): Promise<string[]> {
  const profile = await fetchPassportProfile(userId);
  return profile.achievements;
}

export async function revokePassport(
  userId: string,
  revokedAt: Date = new Date(),
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ passport_revoked_at: revokedAt.toISOString() })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Updates the user's daily streak after a qualifying action
 * (scan, walk completion, quest completion)
 */
export async function updateDailyStreak(userId: string): Promise<StreakUpdate> {
  const { data, error } = await supabase
    .rpc("update_daily_streak", { p_user_id: userId });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No streak data returned");
  }

  const result = data[0];
  return {
    streak_count: result.streak_count,
    is_new_day: result.is_new_day,
    previous_streak: result.previous_streak,
  };
}

/**
 * Get the XP multiplier based on current streak count
 */
export async function getStreakMultiplier(
  streakCount: number,
): Promise<number> {
  const { data, error } = await supabase
    .rpc("get_streak_multiplier", { p_streak_count: streakCount });

  if (error) {
    throw error;
  }

  return data ?? 1.0;
}
