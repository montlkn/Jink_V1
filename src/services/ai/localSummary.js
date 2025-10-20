/**
 * Local, deterministic profile summary composer
 * Builds a short 2–4 sentence write‑up based on the
 * existing archetype metadata to keep tone consistent
 * and avoid any LLM usage/cost.
 */

import { getArchetypeInfo } from "../aestheticScoringService";

function titleCase(str) {
  try {
    return str
      ?.replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "";
  } catch {
    return String(str || "");
  }
}

/**
 * Compose a concise, on‑brand summary from profile data
 *
 * Input shape expected:
 * {
 *   primary_archetype: string,
 *   secondary_archetype?: string,
 *   archetype_scores?: Record<string, number>
 * }
 */
export function composeLocalSummary(profile) {
  if (!profile?.primary_archetype) return null;

  const primary = getArchetypeInfo(profile.primary_archetype);
  const secondary = profile.secondary_archetype
    ? getArchetypeInfo(profile.secondary_archetype)
    : null;

  // Pick 3 key traits from primary, 2 from secondary if present
  const primaryTraits = (primary?.vibe || []).slice(0, 3);
  const secondaryTraits = (secondary?.vibe || []).slice(0, 2);

  const primaryName = primary?.name || titleCase(profile.primary_archetype);
  const secondaryName = secondary?.name || titleCase(profile.secondary_archetype);

  const lead = secondaryName
    ? `Your architectural taste leans toward ${primaryName} with ${secondaryName} influences.`
    : `Your architectural taste leans toward ${primaryName}.`;

  const traitsSentence = primaryTraits.length
    ? `You tend to favor ${primaryTraits.map((t) => t.toLowerCase()).join(
        ", "
      )}${secondaryTraits.length ? `, with hints of ${secondaryTraits
          .map((t) => t.toLowerCase())
          .join(", ")}` : ""}.`
    : null;

  const closing = `Overall, your profile balances personal character with clarity, staying true to core preferences while leaving space for variation.`;

  const parts = [lead, traitsSentence, closing].filter(Boolean);

  return {
    text: parts.join(" "),
    generatedAt: new Date().toISOString(),
    source: "local",
  };
}

