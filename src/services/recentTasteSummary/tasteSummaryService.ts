import { Platform } from "react-native";
import { log } from "@/lib/log";
import { SHOULD_USE_DEMO_WALKS, getDemoWalkSummaries } from "@/lib/walks/demoData";
import { fetchWalkSummaries } from "@/services/gateways";
import type { WalkSummary } from "../../types/walks";
import {
  normalizeArchetypeId,
  buildArchetypePhrase,
  joinPhrases,
  type ArchetypeDatum,
} from "./archetypeHelpers";

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

  const primaryDescriptors = Array.isArray(primaryPhrase.descriptors) ? primaryPhrase.descriptors : [];
  const secondaryDescriptors = secondaryPhrase && Array.isArray(secondaryPhrase.descriptors) ? secondaryPhrase.descriptors : [];

  // Build keywords array safely
  const keywords = [primaryPhrase.label.toLowerCase()];

  if (Array.isArray(primaryDescriptors)) {
    keywords.push(...primaryDescriptors);
  }

  if (secondaryPhrase) {
    keywords.push(secondaryPhrase.label.toLowerCase());
  }

  const modifiers = [
    `leaning ${primaryPhrase.label.toLowerCase()}`,
    joinPhrases(Array.isArray(primaryDescriptors) ? primaryDescriptors : []),
  ].filter(Boolean);

  const secondaryText = secondaryPhrase
    ? ` Secondary notes hint at ${joinPhrases(Array.isArray(secondaryDescriptors) ? secondaryDescriptors : [])} from ${secondaryPhrase.label}.`
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
