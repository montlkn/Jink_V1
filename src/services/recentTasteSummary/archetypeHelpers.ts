import { getArchetypeInfo } from "../aestheticScoringService";
import { formatDescriptor } from "./themeMapping";

export type ArchetypeDatum = {
  name?: string;
  archetype?: string;
  percentage?: number;
  score?: number;
};

export function normalizeArchetypeId(entry?: ArchetypeDatum): string | null {
  const value = entry?.archetype || entry?.name;
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

export function buildArchetypePhrase(
  archetypeId: string | null,
  limit: number
): { label: string; descriptors: string[] } | null {
  if (!archetypeId) return null;
  const info = getArchetypeInfo(archetypeId);
  if (!info) return null;

  const cleanLabel = (info.name || archetypeId)
    .replace(/^The\s+/i, "")
    .trim();

  // Ensure we return a proper array
  let descriptors: string[] = [];
  if (Array.isArray(info.vibe)) {
    const sliced = info.vibe.slice(0, limit);
    const mapped = sliced.map(formatDescriptor);
    const filtered = mapped.filter((d: string) => Boolean(d));
    // Force conversion to a new array to ensure it's iterable
    descriptors = Array.from(filtered);
  }

  return {
    label: cleanLabel,
    descriptors,
  };
}

export function joinPhrases(phrases: string[]): string {
  if (!Array.isArray(phrases) || !phrases.length) return "";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) {
    return `${phrases[0]} and ${phrases[1]}`;
  }
  const head = phrases.slice(0, phrases.length - 1).join(", ");
  const tail = phrases[phrases.length - 1];
  return `${head}, and ${tail}`;
}
