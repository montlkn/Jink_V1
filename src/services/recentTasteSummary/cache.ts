import AsyncStorage from "@react-native-async-storage/async-storage";
import { log } from "@/lib/log";
import type { ArchetypeDatum } from "./archetypeHelpers";

const CACHE_VERSION = "v4"; // Increment this to invalidate all caches
const CACHE_KEY_PREFIX = `@taste_summary_cache_${CACHE_VERSION}_`;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

type CachedTasteSummary = {
  text: string;
  timestamp: number;
  cacheKey: string;
};

export function generateCacheKey(archetypes: ArchetypeDatum[], context: string): string {
  // Ensure archetypes is a proper array
  const safeArchetypes = Array.isArray(archetypes) ? Array.from(archetypes) : [];
  const archetypeStr = safeArchetypes
    .slice(0, 2)
    .map((a) => `${a.name || a.archetype}:${Math.round((a.percentage || a.score || 0) * 10) / 10}`)
    .join("|");
  return `${CACHE_KEY_PREFIX}${context}_${archetypeStr}`;
}

export async function getCachedSummary(cacheKey: string): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed: CachedTasteSummary = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.text;
  } catch (error) {
    log.warn("[tasteCache] Failed to read cache", error);
    return null;
  }
}

export async function setCachedSummary(cacheKey: string, text: string): Promise<void> {
  try {
    const cached: CachedTasteSummary = {
      text,
      timestamp: Date.now(),
      cacheKey,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    log.warn("[tasteCache] Failed to write cache", error);
  }
}

/**
 * Clear all cached taste summaries. Call this when user's profile changes significantly
 * (e.g., after completing quiz, after many new scans/walks).
 */
export async function clearTasteSummaryCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      log.debug(`[tasteCache] Cleared ${cacheKeys.length} cached summaries`);
    }
  } catch (error) {
    log.warn("[tasteCache] Failed to clear cache", error);
  }
}
