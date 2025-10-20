import { getArchetypeColor } from "../../../constants/archetypeColors";

/**
 * ArchetypeMapping: Maps archetype data to glass orb visual parameters
 *
 * Simplified for glass-only orb. Primarily handles color mapping and
 * light intensity based on XP progression.
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

/**
 * Map XP level to light intensity multiplier
 * Higher levels = brighter orb lighting
 */
export function mapXPToBrightness(xpLevel: number, xpProgress: number = 0): number {
  const baseBrightness = 1.0;
  const levelContribution = Math.min(xpLevel / 50, 1.0) * 0.4; // Max +0.4 at level 50
  const progressContribution = xpProgress * 0.1; // Max +0.1 for progress within level
  return baseBrightness + levelContribution + progressContribution;
}

/**
 * Get dominant archetype color from data
 */
export function getDominantArchetypeColor(archetypeData: ArchetypeData[]): string {
  if (!archetypeData || archetypeData.length === 0) {
    return "#ffffff";
  }

  // Sort by percentage/score and get top archetype
  const sorted = [...archetypeData].sort((a, b) => {
    const aVal = a.percentage ?? (a.score || 0);
    const bVal = b.percentage ?? (b.score || 0);
    return bVal - aVal;
  });

  const dominant = sorted[0];
  return dominant.color || getArchetypeColor(dominant.name || dominant.archetype || "Default");
}
