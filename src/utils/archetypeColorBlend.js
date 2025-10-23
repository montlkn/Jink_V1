import * as THREE from "three";
import { getArchetypeColor } from "../constants/archetypeColors";

/**
 * Blends multiple archetype colors weighted by their scores/percentages
 * @param {Array<{color: string, percentage: number, score: number}>} archetypes - Top archetypes with color and weight data
 * @returns {{blendedColor: string, colorA: string, colorB: string, colorC: string}} - Blended color and individual colors for shader
 */
export function blendArchetypeColors(archetypes = []) {
  // Guard: if no archetypes, return default colors
  if (!archetypes || archetypes.length === 0) {
    return {
      blendedColor: "#8cf",
      colorA: "#8cf",
      colorB: "#fff",
      colorC: "#fff",
      palette: [
        { color: "#8cf", weight: 1 },
        { color: "#fff", weight: 1 },
        { color: "#fff", weight: 1 },
      ],
    };
  }

  // Take top 3 archetypes
  const top3 = archetypes.slice(0, 3);

  // Extract colors (fallback to white if missing)
  const colors = top3.map((arch) => {
    const colorHex = arch.color || "#FFFFFF";
    return new THREE.Color(colorHex);
  });

  // Use percentage for weighting (fallback to score if percentage missing)
  const weights = top3.map((arch) => arch.percentage || arch.score || 0);

  // Calculate weighted blend
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    // No valid weights, return first color or default
    const firstColor = top3[0]?.color || "#8cf";
    return {
      blendedColor: firstColor,
      colorA: firstColor,
      colorB: top3[1]?.color || "#fff",
      colorC: top3[2]?.color || "#fff",
      palette: top3.map((arch, idx) => ({
        color: arch?.color || "#FFFFFF",
        weight: 1,
      })),
    };
  }

  // Blend colors weighted by percentage
  const blendedColor = new THREE.Color(0, 0, 0);
  colors.forEach((color, idx) => {
    const ratio = weights[idx] / totalWeight;
    blendedColor.add(color.clone().multiplyScalar(ratio));
  });

  const palette = top3.map((arch, idx) => ({
    color: arch?.color || "#FFFFFF",
    weight: weights[idx] ?? 0,
  }));

  return {
    blendedColor: "#" + blendedColor.getHexString(),
    colorA: top3[0]?.color || "#8cf",
    colorB: top3[1]?.color || "#fff",
    colorC: top3[2]?.color || "#fff",
    palette,
  };
}

/**
 * Normalizes raw archetype score maps into the top three entries expected by the orb.
 * @param {Record<string, number>} archetypeScores
 * @returns {Array<{name: string, archetype: string, score: number, percentage: number, color: string}>}
 */
export function extractTopArchetypesFromScores(archetypeScores = {}) {
  if (!archetypeScores || typeof archetypeScores !== "object") {
    return [];
  }

  const entries = Object.entries(archetypeScores)
    .map(([name, rawScore]) => {
      const score =
        typeof rawScore === "number"
          ? rawScore
          : Number(rawScore) || 0;
      return {
        name,
        score: Math.max(0, score),
      };
    })
    .filter((entry) => typeof entry.name === "string" && entry.name.length > 0);

  if (!entries.length) {
    return [];
  }

  const total = entries.reduce((sum, entry) => sum + entry.score, 0);
  const safeDivisor = total > 0 ? total : entries.length;

  return entries
    .map(({ name, score }) => {
      const percentage = safeDivisor > 0 ? (score / safeDivisor) * 100 : 0;
      return {
        name,
        archetype: name,
        score,
        percentage,
        color: getArchetypeColor(name),
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
}
