import * as THREE from 'three';

/**
 * Blends multiple archetype colors weighted by their scores/percentages
 * @param {Array<{color: string, percentage: number, score: number}>} archetypes - Top archetypes with color and weight data
 * @returns {{blendedColor: string, colorA: string, colorB: string, colorC: string}} - Blended color and individual colors for shader
 */
export function blendArchetypeColors(archetypes = []) {
  // Guard: if no archetypes, return default colors
  if (!archetypes || archetypes.length === 0) {
    return {
      blendedColor: '#8cf',
      colorA: '#8cf',
      colorB: '#fff',
      colorC: '#fff',
      palette: [
        { color: '#8cf', weight: 1 },
        { color: '#fff', weight: 1 },
        { color: '#fff', weight: 1 },
      ],
    };
  }

  // Take top 3 archetypes
  const top3 = archetypes.slice(0, 3);

  // Extract colors (fallback to white if missing)
  const colors = top3.map((arch) => {
    const colorHex = arch.color || '#FFFFFF';
    return new THREE.Color(colorHex);
  });

  // Use percentage for weighting (fallback to score if percentage missing)
  const weights = top3.map((arch) => arch.percentage || arch.score || 0);

  // Calculate weighted blend
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    // No valid weights, return first color or default
    const firstColor = top3[0]?.color || '#8cf';
    return {
      blendedColor: firstColor,
      colorA: firstColor,
      colorB: top3[1]?.color || '#fff',
      colorC: top3[2]?.color || '#fff',
      palette: top3.map((arch, idx) => ({
        color: arch?.color || '#FFFFFF',
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
    color: arch?.color || '#FFFFFF',
    weight: weights[idx] ?? 0,
  }));

  return {
    blendedColor: '#' + blendedColor.getHexString(),
    colorA: top3[0]?.color || '#8cf',
    colorB: top3[1]?.color || '#fff',
    colorC: top3[2]?.color || '#fff',
    palette,
  };
}
