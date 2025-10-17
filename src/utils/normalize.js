/**
 * Normalization utilities for aesthetic profile analysis
 * RESPONSIBILITY: Normalize aesthetic breakdowns to sum to 100.0
 * DO NOT: Add divergence/distance logic here
 */

/**
 * Normalize aesthetic breakdown to sum to exactly 100.0
 * Filters out non-finite and negative values
 *
 * @param {Record<string, number>} m - Aesthetic breakdown
 * @returns {Record<string, number>} Normalized breakdown (sums to 100)
 *
 * @example
 * normalize({ a: 10, b: 20, c: 30 })
 * // => { a: 25, b: 50, c: 75 }
 */
export function normalize(m) {
  if (!m || typeof m !== 'object') return {};

  const entries = Object.entries(m).filter(([, v]) => Number.isFinite(v) && v >= 0);

  if (entries.length === 0) return {};

  const sum = entries.reduce((s, [, v]) => s + v, 0);
  if (sum === 0) return {};

  const scale = 100 / sum;
  return Object.fromEntries(
    entries.map(([k, v]) => [k, parseFloat((v * scale).toFixed(4))])
  );
}

/**
 * Generate SHA-256 hash of normalized breakdown for audit trail
 *
 * @param {Record<string, number>} breakdown
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashBreakdown(breakdown) {
  const normalized = normalize(breakdown);
  const str = JSON.stringify(normalized);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sum all values in breakdown (for audit, pre-normalization)
 *
 * @param {Record<string, number>} breakdown
 * @returns {number} Sum before normalization
 */
export function getSumBeforeNormalize(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return 0;

  return Object.values(breakdown).reduce((sum, v) => {
    if (Number.isFinite(v) && v >= 0) return sum + v;
    return sum;
  }, 0);
}
