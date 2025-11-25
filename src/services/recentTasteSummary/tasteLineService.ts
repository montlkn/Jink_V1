import { Platform } from "react-native";
import { log } from "@/lib/log";
import { SHOULD_USE_DEMO_WALKS, getDemoWalkSummaries } from "@/lib/walks/demoData";
import { fetchWalkSummaries } from "@/services/gateways";
import type { WalkSummary } from "../../types/walks";
import { normalizeArchetypeId, buildArchetypePhrase, type ArchetypeDatum } from "./archetypeHelpers";
import { pickThemeFromDescriptors } from "./themeMapping";
import { selectPersonalizedTemplate, fillTemplateData } from "./templateSelection";
import type { TemplateData } from "./templates";
import { generateCacheKey, getCachedSummary, setCachedSummary } from "./cache";

type SummaryResult = {
  text: string;
  keywords: string[];
  source: "activity" | "profile";
};

type SummaryOptions = {
  userId?: string | null;
  archetypes?: ArchetypeDatum[];
  forceRefresh?: boolean;
  streakCount?: number;
  recentScanCount?: number;
};

export type TasteLineOptions = SummaryOptions;

function formatContextShort(
  walk: WalkSummary | null
): { ctx: string; source: "activity" | "profile" } {
  if (!walk) return { ctx: "Recent taste", source: "profile" };
  const borough = walk.borough ? walk.borough.trim() : "";
  const loc = borough.length ? ` ${borough}` : "";
  return { ctx: `Recent walks${loc}`, source: "activity" };
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

export async function getRecentTasteLine(
  options: TasteLineOptions
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

  // Force proper arrays using Array.from to ensure iterability
  const primaryDescriptors: string[] = Array.isArray(primaryPhrase.descriptors)
    ? Array.from(primaryPhrase.descriptors)
    : [];
  const secondaryDescriptors: string[] = secondaryPhrase && Array.isArray(secondaryPhrase.descriptors)
    ? Array.from(secondaryPhrase.descriptors)
    : [];

  // Safely combine descriptors for theme picking
  const allDescriptors: string[] = [];
  for (const desc of primaryDescriptors) {
    allDescriptors.push(desc);
  }
  for (const desc of secondaryDescriptors) {
    allDescriptors.push(desc);
  }

  const theme = pickThemeFromDescriptors(allDescriptors, primaryPhrase.label);

  // Build keywords array safely
  const keywords: string[] = [
    primaryPhrase.label.toLowerCase(),
    theme,
  ];

  for (const desc of primaryDescriptors) {
    keywords.push(desc);
  }
  for (const desc of secondaryDescriptors) {
    keywords.push(desc);
  }

  // Check cache first
  const cacheKey = generateCacheKey(archetypes, ctx);
  const cachedText = await getCachedSummary(cacheKey);

  if (cachedText) {
    log.debug("[recentTasteLine] Using cached summary:", cachedText);
    return { text: cachedText, keywords, source };
  }

  // Build template data
  const templateData: TemplateData = {
    archetype: primaryPhrase.label,
    descriptor: primaryDescriptors[0] || theme,
    theme,
    location: latestWalk?.borough || null,
    scanCount: options.recentScanCount ?? null,
    streak: options.streakCount ?? null,
    style: primaryPhrase.label,
  };

  // Select and fill template
  const selectedTemplate = selectPersonalizedTemplate(templateData, options.userId);
  const text = fillTemplateData(selectedTemplate, templateData);

  log.debug("[recentTasteLine] Generated template:", text);

  // Cache the result
  await setCachedSummary(cacheKey, text);

  return { text, keywords, source };
}
