import { TASTE_TEMPLATES, type TasteTemplate, type TemplateData } from "./templates";

export function selectPersonalizedTemplate(
  data: TemplateData,
  userId: string | null | undefined
): TasteTemplate {
  // Score each template based on available data
  const scoredTemplates = TASTE_TEMPLATES.map((template) => {
    let score = template.weight;

    // Check if all required data is available
    for (const requirement of template.requiredData) {
      if (requirement === "streak" && !data.streak) {
        score = 0;
        break;
      }
      if (requirement === "location" && !data.location) {
        score = 0;
        break;
      }
      if (requirement === "scanCount" && !data.scanCount) {
        score = 0;
        break;
      }
      // archetype and descriptor are always available
    }

    // Bonus points for templates that use more available data
    if (data.streak && data.streak >= 3 && template.requiredData.includes("streak")) {
      score += 2;
    }
    if (data.scanCount && data.scanCount >= 5 && template.requiredData.includes("scanCount")) {
      score += 1;
    }
    if (data.location && template.requiredData.includes("location")) {
      score += 1;
    }

    return { template, score };
  }).filter((item) => item.score > 0);

  if (scoredTemplates.length === 0) {
    // Fallback to simplest template
    return TASTE_TEMPLATES[0];
  }

  // Sort by score descending
  scoredTemplates.sort((a, b) => b.score - a.score);

  // Use deterministic selection based on userId + date for consistency
  const today = new Date().toISOString().split("T")[0];
  const seed = `${userId || "anon"}_${today}`;
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Pick from top 5 scored templates for variety
  const topTemplates = scoredTemplates.slice(0, Math.min(5, scoredTemplates.length));
  const selectedIndex = hash % topTemplates.length;

  return topTemplates[selectedIndex].template;
}

export function fillTemplateData(template: TasteTemplate, data: TemplateData): string {
  let text = template.template;

  // Replace placeholders
  text = text.replace(/{archetype}/g, data.archetype); // Keep original capitalization
  text = text.replace(/{descriptor}/g, data.descriptor.toLowerCase());
  text = text.replace(/{theme}/g, data.theme.toLowerCase());
  text = text.replace(/{style}/g, data.style); // Keep original capitalization

  if (data.location) {
    text = text.replace(/{location}/g, data.location);
  }

  if (data.scanCount !== null) {
    text = text.replace(/{scanCount}/g, String(data.scanCount));
  }

  if (data.streak !== null) {
    text = text.replace(/{streak}/g, String(data.streak));
  }

  return text;
}
