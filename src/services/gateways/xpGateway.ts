/**
 * XP gateway - handles XP operations and level management
 */
import { log } from "@/lib/log";
import { supabase, coerceNumber } from "./supabaseClient";
import { fetchUserStreak, updateDailyStreak } from "./streakGateway";

export type FetchXpSummaryResult = {
  xp: number;
  level: number;
  xpSpent: number;
  levelTitle?: string;
  levelTier?: string;
};

export type XpSnapshot = FetchXpSummaryResult;

type ProfileXpRow = {
  xp: number | null;
  level: number | null;
  xp_spent: number | null;
  level_title?: string | null;
  level_tier?: string | null;
};

export async function fetchXpSummary(userId: string): Promise<FetchXpSummaryResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("xp, level, xp_spent, level_title, level_tier")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const source = (data ?? {}) as Partial<ProfileXpRow>;

  return {
    xp: coerceNumber(source.xp, 0),
    level: Math.max(1, coerceNumber(source.level, 1)),
    xpSpent: coerceNumber(source.xp_spent, 0),
    levelTitle: source.level_title || undefined,
    levelTier: source.level_tier || undefined,
  };
}

export async function fetchXpSnapshot(params: { userId: string }): Promise<FetchXpSummaryResult> {
  if (!params?.userId) {
    throw new Error("userId is required to fetch XP snapshot");
  }
  return fetchXpSummary(params.userId);
}

type AwardXpParams = {
  amount: number;
  source?: string;
  userId?: string;
  progressIncrement?: number;
};

export type LevelUpResult = {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  newTier: 'explorer' | 'connoisseur' | 'authority' | 'mythic';
  xpEarned: number;
};

/**
 * Award XP and detect level-up for celebration UI
 * Returns level-up information if user leveled up
 */
export async function awardXpWithLevelDetection(params: AwardXpParams): Promise<LevelUpResult> {
  const { userId: explicitUserId } = params;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = explicitUserId ?? user?.id;
  if (!userId) throw new Error("No user logged in");

  // Fetch XP BEFORE awarding
  const beforeSnapshot = await fetchXpSummary(userId);

  // Award XP (existing logic)
  await awardXp(params);

  // Fetch XP AFTER awarding
  const afterSnapshot = await fetchXpSummary(userId);

  // Detect level-up
  const leveledUp = afterSnapshot.level > beforeSnapshot.level;

  return {
    leveledUp,
    oldLevel: beforeSnapshot.level,
    newLevel: afterSnapshot.level,
    newTitle: afterSnapshot.levelTitle || 'Unknown',
    newTier: (afterSnapshot.levelTier || 'explorer') as 'explorer' | 'connoisseur' | 'authority' | 'mythic',
    xpEarned: params.amount,
  };
}

export async function awardXp(params: AwardXpParams): Promise<void> {
  const { amount, source = "building_scan", userId: explicitUserId, progressIncrement = 1 } = params;

  if (!Number.isFinite(amount)) {
    throw new Error("amount must be a finite number");
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = explicitUserId ?? user?.id;
  if (!userId) throw new Error("No user logged in");

  // Fetch user's streak to apply multiplier
  let finalAmount = amount;
  try {
    const streakData = await fetchUserStreak(userId);
    finalAmount = Math.round(amount * streakData.multiplier);
    if (streakData.multiplier > 1) {
      log.info(`[xpGateway] XP multiplier applied: ${amount} × ${streakData.multiplier} = ${finalAmount}`);
    }
  } catch (streakError) {
    log.warn("[xpGateway] Failed to fetch streak for XP multiplier, using base amount", streakError);
  }

  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_amount: finalAmount,
  });

  if (error) throw error;

  // Update level title and tier after awarding XP
  try {
    const { getProgressToNextLevel } = await import('@/constants/xpLevels');
    const xpSummary = await fetchXpSummary(userId);
    const levelInfo = getProgressToNextLevel(xpSummary.xp);

    await supabase
      .from('profiles')
      .update({
        level_title: levelInfo.currentLevelTitle,
        level_tier: levelInfo.tier,
      })
      .eq('id', userId);

    log.info(`[xpGateway] Updated level: ${xpSummary.level} - ${levelInfo.currentLevelTitle} (${levelInfo.tier})`);
  } catch (levelError) {
    log.warn("[xpGateway] Failed to update level title", levelError);
  }

  // Update daily streak after awarding XP
  const STREAK_SOURCES = ['building_scan', 'walk_completion', 'photo_contribution', 'building_contribution'];

  if (STREAK_SOURCES.includes(source)) {
    try {
      const streakUpdate = await updateDailyStreak(userId);
      if (streakUpdate.isNewDay) {
        log.info(`[${source}] Daily streak updated: ${streakUpdate.streakCount} days`);
        if ([3, 7, 30, 100].includes(streakUpdate.streakCount)) {
          log.info(`🎉 Streak milestone reached: ${streakUpdate.streakCount} days`);
        }
      }
    } catch (streakUpdateError) {
      log.warn("[xpGateway] Failed to update daily streak", streakUpdateError);
    }
  }

  // Award stamps for contributions
  if (source === "photo_contribution" || source === "building_contribution") {
    try {
      const stampType = source === "photo_contribution" ? "photo_contributor" : "data_pioneer";

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('stamps')
        .eq('id', userId)
        .single();

      if (fetchError) {
        log.warn("[xpGateway] Failed to fetch current stamps", fetchError);
        return;
      }

      const currentStamps = Array.isArray(profile?.stamps) ? profile.stamps : [];

      if (!currentStamps.includes(stampType)) {
        const updatedStamps = [...currentStamps, stampType];
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stamps: updatedStamps })
          .eq('id', userId);

        if (updateError) {
          log.warn("[xpGateway] Failed to award stamp", updateError);
        } else {
          log.info(`[xpGateway] Awarded stamp: ${stampType}`);
        }
      }
    } catch (stampError) {
      log.warn("[xpGateway] Failed to handle stamp awarding", stampError);
    }
    return;
  }

}
