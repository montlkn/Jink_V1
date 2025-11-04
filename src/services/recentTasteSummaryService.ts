import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { log } from "@/lib/log";
import {
  SHOULD_USE_DEMO_WALKS,
  getDemoWalkSummaries,
} from "@/lib/walks/demoData";
import { fetchWalkSummaries } from "@/services/gateways";
import type { WalkSummary } from "../types/walks";
import { getArchetypeInfo } from "./aestheticScoringService";

const CACHE_KEY_PREFIX = "@taste_summary_cache_";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

type ArchetypeDatum = {
  name?: string;
  archetype?: string;
  percentage?: number;
  score?: number;
};

type SummaryResult = {
  text: string;
  keywords: string[];
  source: "activity" | "profile";
};

type SummaryOptions = {
  userId?: string | null;
  archetypes?: ArchetypeDatum[];
  forceRefresh?: boolean;
};

function clampHeadline(text: string, max = 42): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function shortHeadline(
  kind: "style" | "architect" | "era",
  label: string,
  confidence = 0.8
): string {
  const trimmed = label.trim();
  const soft = confidence < 0.6;
  switch (kind) {
    case "style":
      return clampHeadline(soft ? `Try ${trimmed} nearby` : `More ${trimmed} nearby`);
    case "architect":
      return clampHeadline(
        soft ? `Try works by ${trimmed}` : `More by ${trimmed}`
      );
    case "era":
    default:
      return clampHeadline(soft ? `Try ${trimmed} nearby` : `More from ${trimmed}`);
  }
}

export type RecentScan = {
  style?: string;
  architect?: string;
  year?: number;
};

export type RecentWalk = {
  dominantStyle?: string;
  dominantArchitect?: string;
  era?: { start: number; end: number };
};

export type TasteAction = {
  headline: string;
  filters: {
    style_in?: string[];
    architect_in?: string[];
    year_gte?: number;
    year_lte?: number;
  };
  central: { kind: "style" | "architect" | "era"; label: string };
};

export const DEFAULT_TASTE_ACTION: TasteAction = {
  headline: shortHeadline("style", "something new", 0.5),
  filters: {},
  central: { kind: "style", label: "something new" },
};

const descriptorPhrases: Record<string, string> = {
  Formal: "formal symmetry",
  Symmetrical: "balanced composition",
  Grand: "grand gestures",
  Rational: "rational planning",
  Ornate: "ornate detailing",
  Enduring: "enduring materials",
  Expressive: "expressive forms",
  "Story-Driven": "story-driven narratives",
  Whimsical: "whimsical moments",
  Layered: "layered histories",
  Evocative: "evocative touches",
  Atmospheric: "atmospheric lighting",
  Glamorous: "glamorous facades",
  Geometric: "geometric rhythm",
  Luxurious: "lush interiors",
  Polished: "polished finishes",
  Confident: "confident lines",
  Sophisticated: "sophisticated detailing",
  Clean: "clean planes",
  Intentional: "intentional minimalism",
  Minimal: "minimal ornament",
  Universal: "universal proportions",
  Functional: "functional clarity",
  Sleek: "sleek materials",
  Systematic: "systematic layouts",
  Raw: "raw textures",
  Utilitarian: "utilitarian honesty",
  Edgy: "edgy silhouettes",
  Exposed: "exposed structure",
  Urban: "urban grit",
  Authentic: "authentic patina",
  Sculptural: "sculptural forms",
  Unconventional: "unconventional geometries",
  Dynamic: "dynamic movement",
  Bold: "bold statements",
  Innovative: "innovative detailing",
  Playful: "playful experiments",
  Experimental: "experimental shapes",
  Thematic: "thematic staging",
  Iconic: "iconic silhouettes",
  Commercial: "commercial spectacle",
  Ironic: "ironic twists",
  Spectacular: "spectacular lighting",
  Theatrical: "theatrical flair",
  Accessible: "accessible experiences",
  Rooted: "rooted craft",
  Climatic: "climatic responsiveness",
  Communal: "communal gathering spaces",
  Tactile: "tactile materials",
  Intuitive: "intuitive layouts",
  Regional: "regional vernacular",
  Sustainable: "sustainable choices",
  Efficient: "efficient systems",
  Practical: "practical planning",
  Standardized: "standardized modules",
  "Cost-Conscious": "cost-conscious detailing",
  Megascale: "megascale gestures",
  Technological: "technological layers",
  Engineering: "engineering bravado",
  Monumental: "monumental scale",
  "Material Honest": "material honesty",
  Craft: "crafted joinery",
  Organic: "organic flow",
  Serene: "serene atmospheres",
  Grounded: "grounded textures",
};

function normalizeArchetypeId(entry?: ArchetypeDatum): string | null {
  const value = entry?.archetype || entry?.name;
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function formatDescriptor(descriptor: string): string {
  if (!descriptor) return "";
  const trimmed = descriptor.trim();
  if (descriptorPhrases[trimmed]) {
    return descriptorPhrases[trimmed];
  }

  const normalized = trimmed.replace(/[_-]/g, " ");
  if (descriptorPhrases[normalized]) {
    return descriptorPhrases[normalized];
  }

  return normalized.toLowerCase();
}

function joinPhrases(phrases: string[]): string {
  if (!phrases.length) return "";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) {
    return `${phrases[0]} and ${phrases[1]}`;
  }
  const head = phrases.slice(0, phrases.length - 1).join(", ");
  const tail = phrases[phrases.length - 1];
  return `${head}, and ${tail}`;
}

function buildArchetypePhrase(
  archetypeId: string | null,
  limit: number
): { label: string; descriptors: string[] } | null {
  if (!archetypeId) return null;
  const info = getArchetypeInfo(archetypeId);
  if (!info) return null;

  const cleanLabel = (info.name || archetypeId)
    .replace(/^The\s+/i, "")
    .trim();

  const descriptors = Array.isArray(info.vibe)
    ? info.vibe.slice(0, limit).map(formatDescriptor).filter(Boolean)
    : [];

  return {
    label: cleanLabel,
    descriptors,
  };
}

function formatContextLead(
  walk: WalkSummary | null
): { noun: string; prefix: string; source: "activity" | "profile" } {
  if (!walk) {
    return {
      noun: "taste",
      prefix: "Recently your taste",
      source: "profile",
    };
  }

  const borough = walk.borough ? walk.borough.trim() : "";
  const location = borough.length ? ` around ${borough}` : "";

  return {
    noun: "walks",
    prefix: `Recently your walks${location}`,
    source: "activity",
  };
}

const getLatestWalk = async (userId: string | null | undefined): Promise<WalkSummary | null> => {
  if (!userId) {
    return getDemoWalkSummaries()[0] ?? null;
  }

  if (SHOULD_USE_DEMO_WALKS) {
    return getDemoWalkSummaries()[0] ?? null;
  }

  try {
    const summaries = await fetchWalkSummaries({
      userId,
      platform: Platform.OS,
    });
    if (Array.isArray(summaries) && summaries.length > 0) {
      return summaries[0] ?? null;
    }
  } catch (error) {
    log.warn(
      "[recentTasteSummary] Failed to load walk summaries",
      (error as Error)?.message
    );
  }

  return getDemoWalkSummaries()[0] ?? null;
};

// === compact line support ===
const inverseDescriptorLookup: Record<string, string> = Object.fromEntries(
  Object.entries(descriptorPhrases).map(([k, v]) => [v, k])
);

const themeFromDescriptor: Record<string, string> = {
  Ornate: "decadence",
  Luxurious: "decadence",
  Glamorous: "decadence",
  Grand: "grandeur",
  Monumental: "grandeur",
  Spectacular: "spectacle",
  Theatrical: "spectacle",
  Minimal: "restraint",
  Clean: "restraint",
  Intentional: "restraint",
  Raw: "austerity",
  Utilitarian: "austerity",
  Exposed: "structure",
  Urban: "grit",
  Geometric: "geometry",
  Formal: "order",
  Symmetrical: "order",
  Rational: "order",
  Systematic: "order",
  Organic: "flow",
  Serene: "calm",
  Grounded: "ground",
  Innovative: "novelty",
  Experimental: "experiment",
  Playful: "play",
  Whimsical: "play",
  Iconic: "iconography",
  Sculptural: "sculpture",
  "Material Honest": "material honesty",
  Craft: "craft",
  Tactile: "texture",
  Sustainable: "ethic",
  Regional: "vernacular",
  Functional: "function",
  Efficient: "efficiency",
  Practical: "utility",
  Polished: "polish",
  Sleek: "sleekness",
  Sophisticated: "sophistication",
  Bold: "boldness",
  Edgy: "edge",
};

function pickThemeFromDescriptors(descriptors: string[], fallback: string): string {
  for (const d of descriptors) {
    const rawKey = inverseDescriptorLookup[d] || inverseDescriptorLookup[d.trim()];
    const theme = rawKey ? themeFromDescriptor[rawKey] : undefined;
    if (theme) return theme.toLowerCase();
  }
  const first = descriptors[0];
  if (first) {
    const tokens = first.split(/\s+/);
    const last = tokens[tokens.length - 1];
    if (last) return last.toLowerCase();
  }
  return fallback.toLowerCase();
}

function verbForIntensity(pct: number): string {
  if (pct >= 80) return "strongly favor";
  if (pct >= 55) return "favor";
  if (pct >= 35) return "lean toward";
  return "hint at";
}

function formatContextShort(
  walk: WalkSummary | null
): { ctx: string; source: "activity" | "profile" } {
  if (!walk) return { ctx: "Recent taste", source: "profile" };
  const borough = walk.borough ? walk.borough.trim() : "";
  const loc = borough.length ? ` ${borough}` : "";
  return { ctx: `Recent walks${loc}`, source: "activity" };
}

// Cache helpers
type CachedTasteSummary = {
  text: string;
  timestamp: number;
  cacheKey: string;
};

function generateCacheKey(archetypes: ArchetypeDatum[], context: string): string {
  const archetypeStr = archetypes
    .slice(0, 2)
    .map((a) => `${a.name || a.archetype}:${Math.round((a.percentage || a.score || 0) * 10) / 10}`)
    .join("|");
  return `${CACHE_KEY_PREFIX}${context}_${archetypeStr}`;
}

async function getCachedSummary(cacheKey: string): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed: CachedTasteSummary = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.text;
  } catch (error) {
    log.warn("[tasteCache] Failed to read cache", error);
    return null;
  }
}

async function setCachedSummary(cacheKey: string, text: string): Promise<void> {
  try {
    const cached: CachedTasteSummary = {
      text,
      timestamp: Date.now(),
      cacheKey,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    log.warn("[tasteCache] Failed to write cache", error);
  }
}

/**
 * Clear all cached taste summaries. Call this when user's profile changes significantly
 * (e.g., after completing quiz, after many new scans/walks).
 */
export async function clearTasteSummaryCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      log.debug(`[tasteCache] Cleared ${cacheKeys.length} cached summaries`);
    }
  } catch (error) {
    log.warn("[tasteCache] Failed to clear cache", error);
  }
}

export async function getRecentTasteSummary(
  options: SummaryOptions
): Promise<SummaryResult | null> {
  const archetypes = options?.archetypes ?? [];
  if (!archetypes.length) {
    return null;
  }

  const primaryEntry = archetypes[0];
  const secondaryEntry = archetypes[1] ?? null;

  let latestWalk: WalkSummary | null = null;
  if (options.userId) {
    latestWalk = await getLatestWalk(options.userId);
  }

  const primaryId = normalizeArchetypeId(primaryEntry);
  const primaryPhrase = buildArchetypePhrase(primaryId, 2);

  if (!primaryPhrase) {
    return null;
  }

  const context = formatContextLead(latestWalk);

  const intensity =
    typeof primaryEntry?.percentage === "number"
      ? primaryEntry.percentage
      : primaryEntry?.score ?? 0;

  const secondaryId = normalizeArchetypeId(secondaryEntry);
  const secondaryPhrase = buildArchetypePhrase(secondaryId, 1);

  const keywords = [
    primaryPhrase.label.toLowerCase(),
    ...(primaryPhrase.descriptors ?? []),
  ];

  if (secondaryPhrase) {
    keywords.push(secondaryPhrase.label.toLowerCase());
  }

  const modifiers = [
    `leaning ${primaryPhrase.label.toLowerCase()}`,
    joinPhrases(primaryPhrase.descriptors),
  ].filter(Boolean);

  const secondaryText = secondaryPhrase
    ? ` Secondary notes hint at ${joinPhrases(secondaryPhrase.descriptors)} from ${secondaryPhrase.label}.`
    : "";

  const text = `${context.prefix} are aligning around ${modifiers[0]} — ${modifiers[1]}.${
    intensity ? ` You're expressing it at roughly ${Math.round(intensity)}% intensity.` : ""
  }${secondaryText}`;

  return {
    text,
    keywords,
    source: context.source,
  };
}

// === new terse line generator ===
export async function getRecentTasteLine(
  options: SummaryOptions
): Promise<SummaryResult | null> {
  const archetypes = options?.archetypes ?? [];
  if (!archetypes.length) return null;

  const primaryEntry = archetypes[0];
  const secondaryEntry = archetypes[1] ?? null;

  const primaryId = normalizeArchetypeId(primaryEntry);
  const primaryPhrase = buildArchetypePhrase(primaryId, 3);
  if (!primaryPhrase) return null;

  const secondaryId = normalizeArchetypeId(secondaryEntry);
  const secondaryPhrase = buildArchetypePhrase(secondaryId, 2);

  const latestWalk = options.userId ? await getLatestWalk(options.userId) : null;
  const { ctx, source } = formatContextShort(latestWalk);

  const intensity =
    typeof primaryEntry?.percentage === "number"
      ? primaryEntry.percentage
      : primaryEntry?.score ?? 0;

  const theme = pickThemeFromDescriptors(
    [
      ...(primaryPhrase.descriptors ?? []),
      ...((secondaryPhrase?.descriptors ?? []) as string[]),
    ],
    primaryPhrase.label
  );

  const keywords = [
    primaryPhrase.label.toLowerCase(),
    theme,
    ...(primaryPhrase.descriptors ?? []),
    ...(secondaryPhrase?.descriptors ?? []),
  ];

  // Check cache first
  const cacheKey = generateCacheKey(archetypes, ctx);
  const cachedText = await getCachedSummary(cacheKey);

  if (cachedText) {
    log.debug("[recentTasteLine] Using cached summary:", cachedText);
    return { text: cachedText, keywords, source };
  }

  // Use Gemini to generate natural-sounding taste summary
  log.debug("[recentTasteLine] Generating new AI summary...");
  try {
    const { getGeminiModel } = await import("@/services/gateways/aiGateway");
    const model = getGeminiModel("gemini-2.0-flash-exp");

    const prompt = `Generate a very short, casual summary of architectural taste. Max 8-10 words total.

Data:
- Context: ${ctx}
- Style: ${primaryPhrase.label}
- Theme: ${theme}

Rules:
- MUST be 8-10 words maximum
- Casual, conversational tone
- No "pro..." truncation - must fit on one line
- Simple, direct language
- Examples (notice the brevity):
  * "Recent walks favor playful forms"
  * "Manhattan taste leans theatrical"
  * "Strong preference for minimal restraint"

Generate:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    log.debug("[recentTasteLine] AI generated:", text);

    // Cache the result
    await setCachedSummary(cacheKey, text);

    return { text, keywords, source };
  } catch (error) {
    log.error("[recentTasteLine] Failed to generate AI summary, falling back", error);

    // Fallback to template-based generation
    const verb = verbForIntensity(Math.round(intensity));
    const text = `${ctx} ${verb} ${theme}.`;

    log.debug("[recentTasteLine] Using template fallback:", text);

    return { text, keywords, source };
  }
}

export async function getActionableTaste(input: {
  last10Scans: RecentScan[];
  last3Walks: RecentWalk[];
}): Promise<TasteAction | null> {
  const styleCount = new Map<string, number>();
  const archCount = new Map<string, number>();
  const years: number[] = [];

  const accumulateStyle = (label: string | undefined, weight = 1) => {
    if (!label) {
      return;
    }
    const current = styleCount.get(label) ?? 0;
    styleCount.set(label, current + weight);
  };

  const accumulateArchitect = (label: string | undefined, weight = 1) => {
    if (!label) {
      return;
    }
    const current = archCount.get(label) ?? 0;
    archCount.set(label, current + weight);
  };

  const addYear = (year: number | undefined) => {
    if (typeof year === "number" && Number.isFinite(year)) {
      years.push(Math.round(year));
    }
  };

  for (const scan of input.last10Scans ?? []) {
    accumulateStyle(scan?.style);
    accumulateArchitect(scan?.architect);
    addYear(scan?.year);
  }

  for (const walk of input.last3Walks ?? []) {
    accumulateStyle(walk?.dominantStyle, 0.5);
    accumulateArchitect(walk?.dominantArchitect, 0.5);
    const era = walk?.era;
    if (era) {
      const midpoint = Math.floor(((era.start ?? 0) + (era.end ?? 0)) / 2);
      addYear(midpoint);
      addYear(midpoint);
    }
  }

  const topStyle = pickTop(styleCount);
  const topArchitect = pickTop(archCount);
  const eraResult = inferEra(years);

  if (topStyle) {
    const headline = shortHeadline("style", topStyle, 0.8);
    return {
      headline,
      filters: {
        style_in: [topStyle],
        ...eraBoundsForStyle(topStyle),
      },
      central: { kind: "style", label: topStyle },
    };
  }

  if (topArchitect) {
    const headline = shortHeadline("architect", topArchitect, 0.75);
    return {
      headline,
      filters: { architect_in: [topArchitect] },
      central: { kind: "architect", label: topArchitect },
    };
  }

  if (eraResult) {
    const headline = shortHeadline("era", eraResult.label, 0.65);
    return {
      headline,
      filters: {
        year_gte: eraResult.start,
        year_lte: eraResult.end,
      },
      central: { kind: "era", label: eraResult.label },
    };
  }

  return DEFAULT_TASTE_ACTION;
}

function pickTop(map: Map<string, number>): string | null {
  let winner: string | null = null;
  let weight = Number.NEGATIVE_INFINITY;
  for (const [label, count] of map.entries()) {
    if (count > weight) {
      winner = label;
      weight = count;
    }
  }
  return winner;
}

type EraBounds = { label: string; start: number; end: number };

function inferEra(years: number[]): EraBounds | null {
  if (!years.length) {
    return null;
  }
  const sorted = [...years].sort((a, b) => a - b);
  const sample = (quantile: number) => {
    const idx = Math.floor((sorted.length - 1) * quantile);
    return sorted[idx];
  };

  const p10 = sample(0.1);
  const p90 = sample(0.9);
  const span = p90 - p10;

  if (span <= 0) {
    const center = sorted[Math.floor(sorted.length / 2)];
    return {
      label: `${center}–${center + 1}`,
      start: center - 5,
      end: center + 5,
    };
  }

  const KNOWN_ERAS: EraBounds[] = [
    { label: "the 1880s–1910s", start: 1880, end: 1919 },
    { label: "the 1920s–40s", start: 1920, end: 1949 },
    { label: "the mid-century", start: 1950, end: 1969 },
    { label: "the 1970s–80s", start: 1970, end: 1989 },
  ];

  for (const era of KNOWN_ERAS) {
    const overlap = Math.min(p90, era.end) - Math.max(p10, era.start);
    if (overlap >= 10) {
      return era;
    }
  }

  return {
    label: `${p10}–${p90}`,
    start: p10,
    end: p90,
  };
}

function eraBoundsForStyle(style: string): {
  year_gte?: number;
  year_lte?: number;
} {
  const needle = style.toLowerCase();
  if (needle.includes("deco")) {
    return { year_gte: 1920, year_lte: 1949 };
  }
  if (needle.includes("beaux")) {
    return { year_gte: 1880, year_lte: 1920 };
  }
  if (needle.includes("brut")) {
    return { year_gte: 1955, year_lte: 1985 };
  }
  if (needle.includes("gothic")) {
    return { year_gte: 1830, year_lte: 1910 };
  }
  if (needle.includes("neo")) {
    return { year_gte: 1760, year_lte: 1920 };
  }
  if (needle.includes("modern")) {
    return { year_gte: 1925, year_lte: 1975 };
  }
  return {};
}
