import { Platform } from "react-native";

import { fetchWalkSummaries } from "@/services/gateways/supabaseGateway";
import {
  SHOULD_USE_DEMO_WALKS,
  getDemoWalkSummaries,
} from "@/lib/walks/demoData";
import { getArchetypeInfo } from "./aestheticScoringService";
import type { WalkSummary } from "../types/walks";

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
    console.warn(
      "[recentTasteSummary] Failed to load walk summaries",
      (error as Error)?.message
    );
  }

  return getDemoWalkSummaries()[0] ?? null;
};

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
