import AsyncStorage from "@react-native-async-storage/async-storage";
import { completeWalk, fetchNearbyBuildings } from "@/services/gateways";
import { updateDailyStreak } from "@/services/gateways/passportGateway";
import { clearTasteSummaryCache } from "@/services/recentTasteSummary";
import { log } from "@/lib/log";

type CompleteWalkParams = {
  userId: string;
  walkId: string;
  now?: number;
};

const WALK_COUNT_KEY = "@walk_count_for_taste_cache";

const complete = async (params: CompleteWalkParams) => {
  const result = await completeWalk(params);

  // Update daily streak after completing walk
  try {
    const streakUpdate = await updateDailyStreak(params.userId);
    if (streakUpdate.is_new_day) {
      log.info(`[walks] Daily streak updated: ${streakUpdate.streak_count} days`);
    }
  } catch (error) {
    log.warn("[walks] Failed to update daily streak", error);
  }

  // Clear taste summary cache every 10 walks
  try {
    const countStr = await AsyncStorage.getItem(WALK_COUNT_KEY);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;
    const newCount = currentCount + 1;

    if (newCount >= 10) {
      await clearTasteSummaryCache();
      await AsyncStorage.setItem(WALK_COUNT_KEY, "0");
      log.debug("[walks] Cleared taste summary cache after 10 walks");
    } else {
      await AsyncStorage.setItem(WALK_COUNT_KEY, String(newCount));
      log.debug(`[walks] Walk count: ${newCount}/10 until cache refresh`);
    }
  } catch (error) {
    log.warn("[walks] Failed to update taste cache walk counter", error);
  }

  return result;
};

export const walksActions = {
  complete,
  fetchNearbyBuildings,
};
