/**
 * Recommendation Service
 * Scores buildings based on user aesthetic profile and provides personalized recommendations
 */

import { REC_WEIGHTS } from "@/config/aestheticAlgorithm";

export type BuildingScore = {
  buildingId: string;
  bin: string;
  name: string;
  score: number;
  alignmentScore: number;
  significanceScore: number;
  noveltyScore: number;
  surpriseScore: number;
  reasons: string[];
};

export type AestheticProfile = {
  primary_archetype: string;
  secondary_archetype: string;
  normalized_scores: Record<string, number>;
  confidence: number;
};

export type Building = {
  bin: string;
  name: string;
  aesthetic_profile?: Record<string, number>;
  significance_score?: number;
  year_built?: number;
  architectural_style?: string;
  description?: string;
  popularity_score?: number; // 0-1 scale
  latitude?: number;
  longitude?: number;
};

export type UserStyleExposure = {
  styleExposure: Record<string, number>; // style -> count of times seen
};

/**
 * Calculate how well a building aligns with user's aesthetic profile
 * Uses cosine similarity between user profile and building profile
 */
export function calculateAlignmentScore(
  userProfile: Record<string, number>,
  buildingProfile: Record<string, number> | null | undefined,
): number {
  if (!buildingProfile || Object.keys(buildingProfile).length === 0) {
    return 0;
  }

  // Get all archetype keys from both profiles
  const allKeys = new Set([
    ...Object.keys(userProfile),
    ...Object.keys(buildingProfile),
  ]);

  let dotProduct = 0;
  let userMagnitude = 0;
  let buildingMagnitude = 0;

  for (const key of allKeys) {
    const userScore = userProfile[key] || 0;
    const buildingScore = buildingProfile[key] || 0;

    dotProduct += userScore * buildingScore;
    userMagnitude += userScore * userScore;
    buildingMagnitude += buildingScore * buildingScore;
  }

  userMagnitude = Math.sqrt(userMagnitude);
  buildingMagnitude = Math.sqrt(buildingMagnitude);

  // Avoid division by zero
  if (userMagnitude === 0 || buildingMagnitude === 0) {
    return 0;
  }

  // Cosine similarity ranges from 0 to 1
  return dotProduct / (userMagnitude * buildingMagnitude);
}

/**
 * Normalize building significance score (assume 0-100 scale)
 */
export function normalizeBuildingSignificance(
  score: number | null | undefined,
): number {
  if (!score || score < 0) return 0;
  if (score > 100) return 1;
  return score / 100;
}

/**
 * Calculate novelty score with exposure normalization (UPGRADED)
 * novelty = 1 - (popularity * user_exposure_norm)
 * Takes into account both building popularity AND how often user has seen this style
 * @param buildingPopularity How popular/common this building is (0-1)
 * @param userExposure How many times user has seen this style
 * @returns Novelty score (0-1)
 */
export function calculateNoveltyScore(
  buildingPopularity: number,
  userExposure: number,
): number {
  const maxExposure = 10; // Normalize exposure to 0-1
  const exposureNorm = Math.min(userExposure / maxExposure, 1);

  // novelty = 1 - (popularity * exposure)
  // Rare building (low popularity) you haven't seen = high novelty
  // Common building you've seen many times = low novelty
  return 1 - (buildingPopularity * exposureNorm);
}

/**
 * DEPRECATED: Old year-based novelty (keeping for backwards compatibility)
 * Use calculateNoveltyScore() with exposure data instead
 */
export function calculateNoveltyScoreFromYear(
  yearBuilt: number | null | undefined,
): number {
  if (!yearBuilt || yearBuilt < 0) {
    return 0.5; // Neutral if unknown
  }

  const currentYear = new Date().getFullYear();
  const ageInYears = currentYear - yearBuilt;

  // Older = more novel
  if (ageInYears > 120) return 1.0; // Very old buildings
  if (ageInYears > 75) return 0.9;
  if (ageInYears > 50) return 0.7;
  if (ageInYears > 25) return 0.5;
  return 0.3; // Recent buildings have lower novelty
}

/**
 * Calculate surprise score - how different is building from user's typical taste
 * High surprise = building is quite different from their usual preferences
 * Used to introduce variety in recommendations (5% wildcard weight)
 */
export function calculateSurpriseScore(
  userProfile: Record<string, number>,
  buildingProfile: Record<string, number> | null | undefined,
): number {
  const alignment = calculateAlignmentScore(userProfile, buildingProfile);

  // Surprise is inverse of alignment
  // Low alignment (0.1) = high surprise (0.9)
  // High alignment (0.9) = low surprise (0.1)
  // Bounded to [0.2, 0.9] as per spec
  const surprise = 1 - alignment;
  return Math.max(0.2, Math.min(0.9, surprise));
}

/**
 * Check if building is a "bridge item" (NEW)
 * Bridge items hit user's top-2 archetypes and help transition between styles
 * @param building Building to check
 * @param userProfile User's aesthetic profile
 * @returns True if building overlaps with user's top-2 archetypes
 */
export function isBridgeItem(
  building: Building,
  userProfile: AestheticProfile,
): boolean {
  if (!building.aesthetic_profile) return false;

  // Get user's top-2 archetypes
  const topTwo = Object.entries(userProfile.normalized_scores || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([arch]) => arch);

  // Get building's strong archetypes (>30% weight)
  const buildingArchetypes = Object.entries(building.aesthetic_profile)
    .filter(([, score]) => score > 30)
    .map(([arch]) => arch);

  // Check if any building archetype overlaps with user's top-2
  return buildingArchetypes.some((arch) => topTwo.includes(arch));
}

/**
 * Inject wildcard items into recommendations (NEW)
 * Randomly selects low-alignment buildings for exploration
 * @param scoredBuildings All scored buildings
 * @param injectionRate Percentage of wildcards to inject (default 5%)
 * @returns Buildings with wildcards mixed in
 */
export function injectWildcards(
  scoredBuildings: BuildingScore[],
  injectionRate: number = 0.05,
): BuildingScore[] {
  const wildcardCount = Math.ceil(scoredBuildings.length * injectionRate);

  // Find low-alignment buildings (< 40% alignment)
  const lowAlignment = scoredBuildings
    .filter((b) => b.alignmentScore < 40)
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, wildcardCount);

  // Mark as wildcards and add exploration reason
  lowAlignment.forEach((item) => {
    (item as any).isWildcard = true;
    item.reasons.push("Explore something different");
  });

  // Merge wildcards into main results (don't duplicate if already present)
  const wildcardBins = new Set(lowAlignment.map((w) => w.bin));
  const filtered = scoredBuildings.filter((b) => !wildcardBins.has(b.bin));

  return [...filtered, ...lowAlignment];
}

/**
 * Score a single building against user's aesthetic profile (UPGRADED)
 * Weighted formula:
 * - 60% alignment (how well building matches user's taste)
 * - 25% significance (importance/prestige of building)
 * - 10% novelty (rarity + user exposure)
 * - 5% surprise (buildings different from usual taste for variety)
 * + Bridge item bonus (if building hits user's top-2 archetypes)
 *
 * @param building Building to score
 * @param userProfile User's aesthetic profile
 * @param userExposure Optional: user's style exposure data
 * @returns Scored building with breakdown
 */
export function scoreBuilding(
  building: Building,
  userProfile: AestheticProfile,
  userExposure?: UserStyleExposure,
): BuildingScore {
  const userNormalizedScores = userProfile.normalized_scores || {};

  // Calculate component scores
  const alignmentScore = calculateAlignmentScore(
    userNormalizedScores,
    building.aesthetic_profile,
  );

  const significanceScore = normalizeBuildingSignificance(
    building.significance_score,
  );

  // Novelty: use exposure-aware if available, else fall back to year-based
  let noveltyScore = 0.5;
  if (userExposure && building.architectural_style) {
    const styleExposure =
      userExposure.styleExposure[building.architectural_style.toLowerCase()] ||
      0;
    const popularity = building.popularity_score || 0.5;
    noveltyScore = calculateNoveltyScore(popularity, styleExposure);
  } else {
    // Fallback to year-based novelty
    noveltyScore = calculateNoveltyScoreFromYear(building.year_built);
  }

  const surpriseScore = calculateSurpriseScore(
    userNormalizedScores,
    building.aesthetic_profile,
  );

  // Weighted combination
  let totalScore = alignmentScore * REC_WEIGHTS.alignment +
    significanceScore * REC_WEIGHTS.significance +
    noveltyScore * REC_WEIGHTS.novelty +
    surpriseScore * REC_WEIGHTS.surprise;

  // Bridge item bonus: +5% if building hits user's top-2 archetypes
  const bridgeBonus = isBridgeItem(building, userProfile) ? 0.05 : 0;
  totalScore += bridgeBonus;

  // Generate human-readable reasons
  const reasons: string[] = [];

  if (bridgeBonus > 0) {
    reasons.push("Bridges your top styles");
  }

  if (alignmentScore > 0.7) {
    reasons.push("Matches your aesthetic");
  } else if (alignmentScore > 0.4) {
    reasons.push("Aligns with your style");
  }

  if (significanceScore > 0.7) {
    reasons.push("Important architectural landmark");
  }

  if (noveltyScore > 0.7) {
    reasons.push("Rare style you haven't seen");
  }

  if (surpriseScore > 0.6) {
    reasons.push("Different style to explore");
  }

  return {
    buildingId: building.bin,
    bin: building.bin,
    name: building.name,
    score: Math.round(totalScore * 100), // Scale to 0-100
    alignmentScore: Math.round(alignmentScore * 100),
    significanceScore: Math.round(significanceScore * 100),
    noveltyScore: Math.round(noveltyScore * 100),
    surpriseScore: Math.round(surpriseScore * 100),
    reasons: reasons.length > 0
      ? reasons
      : ["Building of interest in the area"],
  };
}

/**
 * Score multiple buildings and return sorted by recommendation score (UPGRADED)
 * @param buildings Buildings to score
 * @param userProfile User's aesthetic profile
 * @param userExposure Optional: user's style exposure data
 * @param limit Optional: limit number of results
 * @returns Sorted and scored buildings
 */
export function scoreBuildings(
  buildings: Building[],
  userProfile: AestheticProfile,
  userExposure?: UserStyleExposure,
  limit?: number,
): BuildingScore[] {
  const scores = buildings.map((building) =>
    scoreBuilding(building, userProfile, userExposure)
  );

  // Sort by score descending
  const sorted = scores.sort((a, b) => b.score - a.score);

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Split recommendations into tiers:
 * - Top tier (60%): High alignment buildings
 * - Mid tier (35%): Medium alignment buildings
 * - Wild card (5%): Surprise/different buildings
 */
export function segmentRecommendations(
  scores: BuildingScore[],
  config?: { topPercent?: number; midPercent?: number; wildPercent?: number },
): {
  topAligned: BuildingScore[];
  mediumAligned: BuildingScore[];
  wildCards: BuildingScore[];
} {
  const topPercent = config?.topPercent ?? 0.6;
  const midPercent = config?.midPercent ?? 0.35;
  // wildPercent = 1 - topPercent - midPercent

  const topCount = Math.ceil(scores.length * topPercent);
  const midCount = Math.ceil(scores.length * midPercent);

  return {
    topAligned: scores.slice(0, topCount),
    mediumAligned: scores.slice(topCount, topCount + midCount),
    wildCards: scores.slice(topCount + midCount),
  };
}
