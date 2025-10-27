/**
 * Normalization utilities for aesthetic profile analysis
 * RESPONSIBILITY: Normalize aesthetic breakdowns to sum to 100.0
 * DO NOT: Add divergence/distance logic here
 */

export type AestheticBreakdown = Record<string, number>;

const toEntries = (map: AestheticBreakdown | null | undefined) =>
  Object.entries(map ?? {}).filter(([, value]) => Number.isFinite(value) && value >= 0) as [
    string,
    number
  ][];

/**
 * Normalize aesthetic breakdown to sum to exactly 100.0.
 * Filters out non-finite and negative values.
 */
export function normalize(map: AestheticBreakdown | null | undefined): AestheticBreakdown {
  const entries = toEntries(map);
  if (entries.length === 0) return {};

  const sum = entries.reduce((s, [, v]) => s + v, 0);
  if (sum === 0) return {};

  const scale = 100 / sum;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, parseFloat((value * scale).toFixed(4))])
  ) as AestheticBreakdown;
}

/**
 * Generate SHA-256 hash of normalized breakdown for audit trail
 */
export async function hashBreakdown(breakdown: AestheticBreakdown): Promise<string> {
  const normalized = normalize(breakdown);
  const str = JSON.stringify(normalized);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("hashBreakdown requires SubtleCrypto support (crypto.subtle)");
  }

  const hashBuffer = await subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Sum all values in breakdown (for audit, pre-normalization)
 */
export function getSumBeforeNormalize(breakdown: AestheticBreakdown | null | undefined): number {
  if (!breakdown || typeof breakdown !== "object") return 0;

  return Object.values(breakdown).reduce((sum, v) => {
    if (Number.isFinite(v) && v >= 0) return sum + v;
    return sum;
  }, 0);
}
