/**
 * Aesthetic Algorithm Service
 * Core functions for calculating decay, alignment, normalization, and confidence
 */

import {
  ARCHETYPES,
  Archetype,
  DECAY_CONFIG,
  CONFIDENCE_CONFIG,
  CONTEXTUAL_CONFIG,
  SEQUENCE_CONFIG,
  AestheticProfile,
  AestheticEvent,
} from '@/config/aestheticAlgorithm';

/**
 * Calculate logarithmic decay with importance weighting
 * decay(days) = max(min_decay, 1 / (1 + alpha * log(days + 1)))
 * effective_decay = decay(days) * importance^importance_exponent
 * High-scoring archetypes decay slower than low-scoring ones
 * @param days Days since last update
 * @param importance Importance value (0-1, typically raw_score / max_raw_score)
 * @returns Decay multiplier (0-1)
 */
export function calculateDecay(days: number, importance: number): number {
  if (days <= 0) return 1.0;

  const { alpha, minDecay, importanceExponent } = DECAY_CONFIG;

  // Base logarithmic decay
  const baseDecay = Math.max(minDecay, 1 / (1 + alpha * Math.log(days + 1)));

  // Apply importance weighting (high importance = slower decay)
  const importanceWeight = Math.pow(importance, importanceExponent);

  return baseDecay * importanceWeight;
}

/**
 * Apply decay to all raw scores based on days since update
 * Uses logarithmic decay with importance weighting
 * @param rawScores Current raw scores
 * @param days Days since last update
 * @returns Decayed scores
 */
export function applyDecayToProfile(
  rawScores: Record<Archetype, number>,
  days: number
): Record<Archetype, number> {
  if (days <= 0) return rawScores;

  const decayed: any = {};
  const maxScore = Math.max(...ARCHETYPES.map(arch => rawScores[arch] || 0));

  ARCHETYPES.forEach((arch) => {
    const score = rawScores[arch] || 0;
    const importance = maxScore > 0 ? score / maxScore : 0;
    const decay = calculateDecay(days, importance);
    decayed[arch] = score * decay;
  });

  return decayed;
}

/**
 * Calculate cosine similarity between two profiles
 * Returns value between 0 (completely different) and 1 (identical)
 * @param profileA First profile scores
 * @param profileB Second profile scores
 * @returns Alignment score 0-1
 */
export function calculateAlignment(
  profileA: Record<Archetype, number>,
  profileB: Record<Archetype, number>
): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  ARCHETYPES.forEach((arch) => {
    const a = profileA[arch] || 0;
    const b = profileB[arch] || 0;
    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  });

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  const cosine = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  // Map [-1, 1] to [0, 1]
  return Math.max(0, Math.min(1, (cosine + 1) / 2));
}

/**
 * Normalize raw scores to sum to 100
 * Handles edge cases (all zeros, negative values)
 * @param rawScores Raw scores before normalization
 * @returns Normalized scores that sum to 100
 */
export function normalizeScores(
  rawScores: Record<Archetype, number>
): Record<Archetype, number> {
  const positiveSum = ARCHETYPES.reduce(
    (sum, arch) => sum + Math.max(0, rawScores[arch]),
    0
  );

  if (positiveSum === 0) {
    // Return uniform distribution for cold-start
    const uniform: any = {};
    ARCHETYPES.forEach((arch) => {
      uniform[arch] = 100 / ARCHETYPES.length;
    });
    return uniform;
  }

  const normalized: any = {};
  ARCHETYPES.forEach((arch) => {
    normalized[arch] = (Math.max(0, rawScores[arch]) / positiveSum) * 100;
  });

  return normalized;
}

/**
 * Calculate advanced confidence score (0-95) with multiple components
 * confidence = baseConfidence + diversityBonus + consistencyBonus
 * - baseConfidence: grows with total actions (max 70)
 * - diversityBonus: grows with variety of action types (10 per type)
 * - consistencyBonus: grows with profile clarity (low entropy = focused taste)
 * @param totalActions Total number of actions taken
 * @param actionDiversity Number of distinct action types
 * @param entropy Profile entropy (0 to ln(9) ≈ 2.197)
 * @returns Confidence score 10-95
 */
export function calculateConfidence(
  totalActions: number,
  actionDiversity: number,
  entropy: number
): number {
  const K = 9; // Number of archetypes
  const {
    baseMultiplier,
    baseMax,
    diversityMultiplier,
    consistencyMax,
    lowerBound,
    upperBound,
  } = CONFIDENCE_CONFIG;

  // Base confidence from total actions
  const baseConfidence = Math.min(baseMax, totalActions * baseMultiplier);

  // Diversity bonus: more action types = higher confidence
  const diversityBonus = actionDiversity * diversityMultiplier;

  // Consistency bonus: focused profile (low entropy) = higher confidence
  const consistencyBonus = (1 - entropy / Math.log(K)) * consistencyMax;

  const total = baseConfidence + diversityBonus + consistencyBonus;

  return Math.max(lowerBound, Math.min(upperBound, total));
}

/**
 * Calculate contextual weight multiplier
 * contextual_weight = surprise_factor * (1 + significance/100)
 * Boosts weight for surprising or significant buildings
 * @param alignmentScore Alignment between user and building (0-1)
 * @param significanceScore Building significance (0-100)
 * @returns Contextual weight multiplier
 */
export function calculateContextualWeight(
  alignmentScore: number,
  significanceScore: number
): number {
  const {
    surpriseLowThreshold,
    surpriseHighThreshold,
    surpriseLowMultiplier,
    surpriseHighMultiplier,
    surpriseNormalMultiplier,
  } = CONTEXTUAL_CONFIG;

  // Surprise factor: different buildings = higher weight
  let surpriseFactor = surpriseNormalMultiplier;
  if (alignmentScore < surpriseLowThreshold) {
    surpriseFactor = surpriseLowMultiplier; // Very different
  } else if (alignmentScore > surpriseHighThreshold) {
    surpriseFactor = surpriseHighMultiplier; // Very similar
  }

  // Significance boost: important buildings = higher weight
  const significanceBoost = 1 + (significanceScore / 100);

  return surpriseFactor * significanceBoost;
}

/**
 * Calculate sequence bonus for repeated style scans
 * Rewards exploring the same architectural style in depth
 * @param styleCounts Map of style -> count in current session
 * @param currentStyle Style of current building
 * @returns Sequence bonus (0, 1.5, or 5.0)
 */
export function calculateSequenceBonus(
  styleCounts: Record<string, number>,
  currentStyle: string
): number {
  if (!currentStyle) return 0;

  const count = (styleCounts[currentStyle] || 0) + 1; // +1 for current scan

  const { threeStyleBonus, tenStyleBonus } = SEQUENCE_CONFIG;

  if (count >= 10) return tenStyleBonus;
  if (count >= 3) return threeStyleBonus;
  return 0;
}

/**
 * Add small random noise to differentiate cold-start users
 * Prevents identical profiles for users with identical quiz responses
 * @param rawScores Scores to add noise to
 * @returns Scores with ±5% random noise
 */
export function addColdStartNoise(
  rawScores: Record<Archetype, number>
): Record<Archetype, number> {
  const noisy: any = {};
  ARCHETYPES.forEach((arch) => {
    const noise = (Math.random() - 0.5) * 0.1; // ±5%
    noisy[arch] = rawScores[arch] * (1 + noise);
  });
  return noisy;
}

/**
 * Main function: Process events and update profile
 * Applies decay, adds event contributions, normalizes, calculates advanced confidence
 * @param currentProfile Current user profile
 * @param events Events to process (should be sorted by timestamp)
 * @returns Updated profile
 */
export function processEventsAndUpdateProfile(
  currentProfile: AestheticProfile,
  events: AestheticEvent[]
): AestheticProfile {
  // 1. Apply logarithmic decay with importance weighting (now uses DAYS not weeks)
  const daysSinceUpdate = getDaysSince(currentProfile.last_decay_timestamp || currentProfile.last_updated);
  let rawScores = applyDecayToProfile(currentProfile.raw_scores, daysSinceUpdate);

  // 2. Process each event and add contributions
  const actionCounts = { ...currentProfile.action_counts };

  for (const event of events) {
    const weight = event.final_weight || event.base_weight || 1;

    // Quiz/image events: use aesthetic_vector directly
    if (event.aesthetic_vector) {
      ARCHETYPES.forEach((arch) => {
        rawScores[arch] = (rawScores[arch] || 0) + (event.aesthetic_vector![arch] || 0) * weight;
      });
    }
    // Building events: use building profile scaled by weight
    else if (event.building_aesthetic_profile) {
      ARCHETYPES.forEach((arch) => {
        const buildingScore = event.building_aesthetic_profile![arch] || 0;
        // Normalize building scores from 0-100 to 0-1
        rawScores[arch] = (rawScores[arch] || 0) + (buildingScore / 100) * weight;
      });
    }

    // Track action counts
    actionCounts[event.event_type] = (actionCounts[event.event_type] || 0) + 1;
  }

  // 3. Add small noise for cold-start differentiation
  const totalActions = Object.values(actionCounts).reduce((sum, c) => sum + (c as number), 0);
  if (totalActions < 5) {
    rawScores = addColdStartNoise(rawScores);
  }

  // 4. Normalize scores to sum to 100
  const normalizedScores = normalizeScores(rawScores);

  // 5. Calculate entropy for profile consistency
  const entropy = calculateEntropy(normalizedScores);

  // 6. Calculate action diversity (number of distinct action types)
  const actionDiversity = Object.keys(actionCounts).length;

  // 7. Calculate advanced confidence (now uses diversity and entropy)
  const confidence = calculateConfidence(totalActions, actionDiversity, entropy);

  return {
    ...currentProfile,
    raw_scores: rawScores,
    normalized_scores: normalizedScores,
    confidence,
    action_counts: actionCounts,
    last_updated: new Date(),
    last_decay_timestamp: new Date(),
    total_events_processed: (currentProfile.total_events_processed || 0) + events.length,
  };
}

/**
 * Calculate Shannon entropy of normalized scores
 * Measures how distributed the profile is across archetypes
 * High entropy = diverse taste, Low entropy = focused taste
 * @param normalizedScores Normalized scores (sum to 100)
 * @returns Entropy value (0 to ln(9) ≈ 2.197)
 */
export function calculateEntropy(normalizedScores: Record<Archetype, number>): number {
  let entropy = 0;
  ARCHETYPES.forEach((arch) => {
    const p = normalizedScores[arch] / 100; // Convert to probability (0-1)
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  });
  return entropy;
}

/**
 * Helper function: Get weeks since a date
 * @param date Date to calculate from
 * @returns Number of weeks
 */
export function getWeeksSince(date: Date | string): number {
  const then = new Date(date).getTime();
  const now = new Date().getTime();
  const milliseconds = now - then;
  return milliseconds / (1000 * 60 * 60 * 24 * 7); // Convert to weeks
}

/**
 * Helper function: Get days since a date
 * @param date Date to calculate from
 * @returns Number of days
 */
export function getDaysSince(date: Date | string): number {
  const then = new Date(date).getTime();
  const now = new Date().getTime();
  const milliseconds = now - then;
  return milliseconds / (1000 * 60 * 60 * 24); // Convert to days
}
