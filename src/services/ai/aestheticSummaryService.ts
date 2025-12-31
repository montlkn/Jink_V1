/**
 * Aesthetic Summary Service - Client-Side Gemini + AsyncStorage Cache
 * NO MODAL NEEDED - generates summaries on device
 */

import { log } from "@/lib/log";
import { getArchetypeInfo } from "@/services/aestheticScoringService";
import { getGeminiModel } from "@/services/gateways";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "aesthetic_summary_cache";
const CACHE_VERSION = "v2";

export type AestheticSummary = {
    text: string;
    keyPhrases: string[];
    generatedAt: string;
    archetypeHash: string;
    sourceModel: string;
    placeholder?: boolean;
};

type ProfileData = {
    primary_archetype?: string;
    secondary_archetype?: string;
    archetype_scores?: Record<string, number>;
};

/**
 * Create a hash of archetype scores to detect changes
 */
function createArchetypeHash(profile: ProfileData): string {
    if (!profile?.archetype_scores) return "empty";

    // Sort keys and create deterministic string
    // Round to 3% increments to avoid regenerating on tiny score changes
    const sorted = Object.entries(profile.archetype_scores)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${Math.round(v * 100 / 3) * 3}`)
        .join("|");

    // Simple hash
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
        const char = sorted.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `${CACHE_VERSION}-${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached summary from AsyncStorage
 */
async function getCachedSummary(
    userId: string,
): Promise<AestheticSummary | null> {
    try {
        const key = `${CACHE_KEY}_${userId}`;
        const cached = await AsyncStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as AestheticSummary;
        log.info("[AestheticSummary] Cache hit", {
            hash: parsed.archetypeHash,
            generatedAt: parsed.generatedAt,
        });
        return parsed;
    } catch (error) {
        log.warn("[AestheticSummary] Cache read error:", error);
        return null;
    }
}

/**
 * Save summary to AsyncStorage cache
 */
async function cacheSummary(
    userId: string,
    summary: AestheticSummary,
): Promise<void> {
    try {
        const key = `${CACHE_KEY}_${userId}`;
        await AsyncStorage.setItem(key, JSON.stringify(summary));
        log.info("[AestheticSummary] Cached summary", {
            hash: summary.archetypeHash,
        });
    } catch (error) {
        log.warn("[AestheticSummary] Cache write error:", error);
    }
}

/**
 * Generate aesthetic summary using client-side Gemini
 */
async function generateSummary(
    profile: ProfileData,
): Promise<AestheticSummary> {
    const model = getGeminiModel("gemini-2.0-flash-lite");

    const primaryInfo = profile.primary_archetype
        ? getArchetypeInfo(profile.primary_archetype)
        : null;
    const secondaryInfo = profile.secondary_archetype
        ? getArchetypeInfo(profile.secondary_archetype)
        : null;

    // Build score breakdown
    const scoreBreakdown = profile.archetype_scores
        ? Object.entries(profile.archetype_scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, score]) => `${name}: ${Math.round(score * 100)}%`)
            .join(", ")
        : "";

    const prompt =
        `You are writing a personalized aesthetic profile summary for an architecture enthusiast app.

User's Aesthetic Profile:
- Primary Archetype: ${profile.primary_archetype || "Unknown"} (${
            primaryInfo?.tagline || ""
        })
- Secondary Archetype: ${profile.secondary_archetype || "None"} (${
            secondaryInfo?.tagline || ""
        })
- Score Breakdown: ${scoreBreakdown}

Write a 2-3 sentence personalized summary describing their unique architectural taste and aesthetic sensibility. Be specific about what draws them to certain styles. Write in second person ("You are drawn to...").

Then list 3-5 key phrases that capture their aesthetic identity (e.g., "Bold Geometric Forms", "Industrial Elegance").

Format your response EXACTLY as:
SUMMARY: [Your 2-3 sentence summary here]
PHRASES: [phrase1], [phrase2], [phrase3], [phrase4], [phrase5]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse response
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=PHRASES:|$)/is);
    const phrasesMatch = responseText.match(/PHRASES:\s*(.+)/i);

    const summaryText = summaryMatch?.[1]?.trim() || responseText.trim();
    const keyPhrases = phrasesMatch?.[1]
        ?.split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && p.length < 50) || [];

    return {
        text: summaryText,
        keyPhrases: keyPhrases.slice(0, 5),
        generatedAt: new Date().toISOString(),
        archetypeHash: createArchetypeHash(profile),
        sourceModel: "gemini-2.0-flash-lite-client",
        placeholder: false,
    };
}

/**
 * Get aesthetic summary - uses cache if available and valid
 * NO MODAL - runs entirely on client
 */
export async function getAestheticSummary(
    userId: string,
    profile: ProfileData,
    forceRegenerate = false,
): Promise<AestheticSummary> {
    const currentHash = createArchetypeHash(profile);

    // Check cache first (unless forcing regeneration)
    if (!forceRegenerate) {
        const cached = await getCachedSummary(userId);
        if (cached && cached.archetypeHash === currentHash) {
            return cached;
        }

        if (cached) {
            log.info("[AestheticSummary] Hash mismatch, regenerating", {
                cached: cached.archetypeHash,
                current: currentHash,
            });
        }
    }

    // Generate new summary
    log.info("[AestheticSummary] Generating with client-side Gemini...");
    const summary = await generateSummary(profile);

    // Cache it
    await cacheSummary(userId, summary);

    return summary;
}

/**
 * Clear cached summary (for testing or logout)
 */
export async function clearSummaryCache(userId: string): Promise<void> {
    try {
        const key = `${CACHE_KEY}_${userId}`;
        await AsyncStorage.removeItem(key);
        log.info("[AestheticSummary] Cache cleared");
    } catch (error) {
        log.warn("[AestheticSummary] Cache clear error:", error);
    }
}
