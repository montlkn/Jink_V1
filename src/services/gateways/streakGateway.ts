/**
 * Streak gateway - handles daily streak tracking
 */
import { log } from "@/lib/log";
import { supabase, coerceNumber } from "./supabaseClient";

export type StreakSnapshot = {
  streakCount: number;
  lastActivityDate: string | null;
  streakStartedAt: string | null;
  multiplier: number;
};

export type UpdateStreakResult = {
  streakCount: number;
  isNewDay: boolean;
  previousStreak: number;
};

/**
 * Fetch current streak data for a user
 */
export async function fetchUserStreak(userId: string): Promise<StreakSnapshot> {
  const { data, error } = await supabase
    .from("profiles")
    .select("daily_streak_count, last_activity_date, streak_started_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const streakCount = coerceNumber(data.daily_streak_count, 0);

  // Calculate multiplier based on streak count
  let multiplier = 1.0;
  if (streakCount >= 30) {
    multiplier = 3.0;
  } else if (streakCount >= 7) {
    multiplier = 2.0;
  } else if (streakCount >= 3) {
    multiplier = 1.5;
  }

  return {
    streakCount,
    lastActivityDate: data.last_activity_date || null,
    streakStartedAt: data.streak_started_at || null,
    multiplier,
  };
}

/**
 * Fetch the count of recent scans for a user within the last N days
 */
export async function fetchRecentScanCount(userId: string, days = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: walkData, error: walkError } = await supabase
    .from("walk_summaries")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", cutoffDate.toISOString());

  if (walkError) {
    log.warn("[streakGateway] Failed to fetch recent walks", walkError);
    return 0;
  }

  if (!walkData || walkData.length === 0) return 0;

  const walkIds = walkData.map((walk) => walk.id);

  const { count, error } = await supabase
    .from("walk_seen_points")
    .select("*", { count: "exact", head: true })
    .eq("scanned", true)
    .in("walk_id", walkIds);

  if (error) {
    log.warn("[streakGateway] Failed to fetch recent scan count", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Update daily streak for a user after a qualifying action
 */
export async function updateDailyStreak(userId: string): Promise<UpdateStreakResult> {
  const { data, error } = await supabase.rpc("update_daily_streak", {
    p_user_id: userId,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No data returned from update_daily_streak");
  }

  const row = data[0];

  return {
    streakCount: coerceNumber(row.streak_count, 0),
    isNewDay: Boolean(row.is_new_day),
    previousStreak: coerceNumber(row.previous_streak, 0),
  };
}

export type StreakMilestoneResult = {
  reachedMilestone: boolean;
  milestoneLevel: 3 | 7 | 30 | 100 | null;
  streakCount: number;
  newMultiplier: number;
  previousMultiplier: number;
};

/**
 * Update streak and detect milestone achievements
 * Milestones: 3, 7, 30, 100 days
 */
export async function updateStreakWithMilestoneDetection(userId: string): Promise<StreakMilestoneResult> {
  // Get old streak data for comparison
  const beforeData = await fetchUserStreak(userId);

  // Update streak using existing RPC
  const updateResult = await updateDailyStreak(userId);

  // Get new streak data
  const afterData = await fetchUserStreak(userId);

  // Detect milestone (3, 7, 30, 100 days)
  const MILESTONES = [3, 7, 30, 100] as const;
  let reachedMilestone = false;
  let milestoneLevel: 3 | 7 | 30 | 100 | null = null;

  if (updateResult.isNewDay) {
    for (const milestone of MILESTONES) {
      if (updateResult.streakCount === milestone) {
        reachedMilestone = true;
        milestoneLevel = milestone;
        log.info(`🔥 Streak milestone reached: ${milestone} days`);
        break;
      }
    }
  }

  return {
    reachedMilestone,
    milestoneLevel,
    streakCount: updateResult.streakCount,
    newMultiplier: afterData.multiplier,
    previousMultiplier: beforeData.multiplier,
  };
}
