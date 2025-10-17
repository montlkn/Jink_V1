/**
 * Divergence detection and baseline management
 * RESPONSIBILITY: Calculate TV distance and determine regeneration triggers
 * Implements hysteresis to prevent ping-ponging regenerations
 */

import { normalize } from './normalize';

export const DIVERGENCE_POLICY = {
  triggerThresholdPct: 6, // Regenerate when TV distance >= 6%
  baselineDeadbandPct: 3, // Only update baseline when divergence falls below 3%
  minBaselineAgeDays: 14, // Don't update baseline for 14 days
  minInteractionsSinceBaseline: 20, // Or until 20 interactions
};

/**
 * Calculate Total Variation Distance (L1/2) between two normalized distributions
 * Both inputs are pre-normalized to [0, 100]
 * Result is in percentage points [0, 100]
 *
 * @param {Record<string, number>} oldMap - Baseline aesthetic breakdown (normalized)
 * @param {Record<string, number>} newMap - Current aesthetic breakdown (normalized)
 * @returns {number} TV distance in percentage points
 *
 * @example
 * // TV = (|50-40| + |25-30| + |25-30|) / 2 = 10
 * totalVariation({ a: 50, b: 25, c: 25 }, { a: 40, b: 30, c: 30 })
 */
export function totalVariation(oldMap, newMap) {
  if (!oldMap || !newMap) return 0;

  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  let l1 = 0;

  for (const k of keys) {
    l1 += Math.abs((oldMap[k] ?? 0) - (newMap[k] ?? 0));
  }

  return l1 / 2; // TV distance in percentage points
}

/**
 * Check if current breakdown should trigger regeneration
 * Returns { shouldRegenerate, divergencePct }
 */
export function checkDivergence(currentBreakdown, baselineBreakdown) {
  const normalized_current = normalize(currentBreakdown);
  const normalized_baseline = normalize(baselineBreakdown);

  const divergence = totalVariation(normalized_baseline, normalized_current);

  return {
    shouldRegenerate: divergence >= DIVERGENCE_POLICY.triggerThresholdPct,
    divergencePct: parseFloat(divergence.toFixed(2)),
    thresholdPct: DIVERGENCE_POLICY.triggerThresholdPct,
  };
}

/**
 * Check if baseline should be updated (hysteresis deadband)
 * Only update if:
 * 1. Divergence is below deadband
 * 2. Baseline is old enough (age check)
 * 3. Enough interactions since last baseline (interaction check)
 */
export function shouldUpdateBaseline(
  currentBreakdown,
  baselineBreakdown,
  baselineGeneratedAt,
  interactionsSinceBaseline
) {
  const { divergencePct } = checkDivergence(currentBreakdown, baselineBreakdown);

  // Fail fast if divergence too high
  if (divergencePct >= DIVERGENCE_POLICY.baselineDeadbandPct) {
    return false;
  }

  // Check age: must be at least 14 days old
  const ageMs = Date.now() - new Date(baselineGeneratedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < DIVERGENCE_POLICY.minBaselineAgeDays) {
    return false;
  }

  // Check interactions: must have at least 20 interactions
  if (interactionsSinceBaseline < DIVERGENCE_POLICY.minInteractionsSinceBaseline) {
    return false;
  }

  return true;
}

/**
 * Prepare baseline snapshot for persistence
 */
export function createBaselineSnapshot(breakdown, breakdownHash, version) {
  return {
    breakdown: normalize(breakdown),
    baseline_hash: breakdownHash,
    baseline_version: version,
    baseline_breakdown: normalize(breakdown),
  };
}
