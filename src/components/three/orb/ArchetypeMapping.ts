import { getArchetypeColor } from "../../../constants/archetypeColors";

/**
 * ArchetypeMapping: Maps archetype data to volumetric smoke visual parameters
 *
 * Layer roles:
 * - Core (layer 0): dense, slow, dominant archetype
 * - Energy (layer 1): mid-density, pulsing, secondary archetype
 * - Ripple (layer 2): airy, fast, tertiary archetype
 */

export type ArchetypeType =
  | "classicist"
  | "romantic"
  | "stylist"
  | "modernist"
  | "industrialist"
  | "visionary"
  | "popculturalist"
  | "vernacularist"
  | "austerist";

export interface ArchetypeData {
  name: string;
  archetype?: string;
  percentage?: number;
  score?: number;
  color?: string;
}

export interface LayerConfig {
  color: string;
  density: number;
  scale: number;
  rotationSpeed: number;
  turbulence: number;
  brightness: number;
  noiseScale: number;
  position: [number, number, number];
  renderOrder: number;
}

/**
 * Map archetype strength (0..1) to density
 * Core layer is denser, outer layers are lighter
 */
export function mapDensity(strength: number, layerIndex: number): number {
  const baseDensity = [0.5, 0.35, 0.25][layerIndex] || 0.4; // Core, Energy, Ripple - reduced for more transparency
  return baseDensity + strength * 0.25;
}

/**
 * Map archetype strength to scale
 * Stronger archetypes have larger smoke volumes
 */
export function mapScale(strength: number, layerIndex: number): number {
  const baseScale = [1.0, 0.85, 0.7][layerIndex] || 0.85;
  return baseScale + strength * 0.3;
}

/**
 * Map archetype strength to rotation speed
 * Weaker archetypes rotate faster (more agitated)
 * Stronger archetypes rotate slower (more stable)
 */
export function mapRotationSpeed(strength: number, layerIndex: number): number {
  const baseSpeed = [0.08, 0.15, 0.25][layerIndex] || 0.15;
  return baseSpeed + (1.0 - strength) * 0.1;
}

/**
 * Map archetype strength to turbulence
 */
export function mapTurbulence(strength: number): number {
  return 0.3 + strength * 0.4;
}

/**
 * Map archetype strength to noise scale
 */
export function mapNoiseScale(strength: number, layerIndex: number): number {
  const baseScale = [2.5, 3.0, 3.8][layerIndex] || 3.0;
  return baseScale + strength * 0.5;
}

/**
 * Map XP level to brightness multiplier
 * Higher levels = brighter orb
 */
export function mapXPToBrightness(xpLevel: number, xpProgress: number = 0): number {
  const baseBrightness = 1.2; // Increased base brightness
  const levelContribution = Math.min(xpLevel / 50, 1.0) * 0.6; // Max +0.6 at level 50
  const progressContribution = xpProgress * 0.15; // Max +0.15 for progress within level
  return baseBrightness + levelContribution + progressContribution;
}

/**
 * Layer positions: slight offsets for depth
 * Core centered, Energy/Ripple slightly offset
 */
export function getLayerPosition(layerIndex: number): [number, number, number] {
  const positions: Array<[number, number, number]> = [
    [0, 0, 0],           // Core: centered
    [0.05, 0.08, 0.03],  // Energy: slight offset
    [-0.08, -0.05, -0.04], // Ripple: opposite offset
  ];
  return positions[layerIndex] || [0, 0, 0];
}

/**
 * Convert archetype data to layer configurations
 * Takes top 3 archetypes and maps them to 3 smoke layers
 */
export function archetypeDataToLayers(
  archetypeData: ArchetypeData[],
  xpLevel: number = 1,
  xpProgress: number = 0
): LayerConfig[] {
  // Sort by percentage/score and take top 3
  const sorted = [...archetypeData]
    .map((arch) => ({
      ...arch,
      strength: arch.percentage !== undefined
        ? arch.percentage / 100
        : (arch.score || 0) / 100,
    }))
    .sort((a, b) => (b.strength || 0) - (a.strength || 0))
    .slice(0, 3);

  // Ensure we have 3 layers (pad with defaults if needed)
  while (sorted.length < 3) {
    sorted.push({
      name: "Default",
      strength: 0.33,
      color: "#7CFF3B",
    });
  }

  const baseBrightness = mapXPToBrightness(xpLevel, xpProgress);

  return sorted.map((arch, index) => {
    const strength = Math.max(0, Math.min(1, arch.strength || 0.33));
    const name = arch.name || arch.archetype || "Default";
    const color = arch.color || getArchetypeColor(name);

    return {
      color,
      density: mapDensity(strength, index),
      scale: mapScale(strength, index),
      rotationSpeed: mapRotationSpeed(strength, index),
      turbulence: mapTurbulence(strength),
      brightness: baseBrightness * (1.0 + strength * 0.3), // Stronger layers slightly brighter
      noiseScale: mapNoiseScale(strength, index),
      position: getLayerPosition(index),
      renderOrder: 10 + index, // Core=10, Energy=11, Ripple=12
    };
  });
}

/**
 * Get default layer configuration for fallback
 */
export function getDefaultLayers(): LayerConfig[] {
  return archetypeDataToLayers(
    [
      { name: "Romantic", percentage: 36 },      // Purple #8B008B
      { name: "Industrialist", percentage: 32 }, // Teal #008080
      { name: "Stylist", percentage: 28 },       // Yellow/Gold #FFD700
    ],
    1,
    0
  );
}
