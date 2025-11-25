export const descriptorPhrases: Record<string, string> = {
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

export const inverseDescriptorLookup: Record<string, string> = Object.fromEntries(
  Object.entries(descriptorPhrases).map(([k, v]) => [v, k])
);

export const themeFromDescriptor: Record<string, string> = {
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

export function formatDescriptor(descriptor: string): string {
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

export function pickThemeFromDescriptors(descriptors: string[], fallback: string): string {
  // Ensure descriptors is an array
  if (!Array.isArray(descriptors)) {
    console.warn('[pickThemeFromDescriptors] descriptors is not an array:', typeof descriptors, descriptors);
    return fallback.toLowerCase();
  }

  for (const d of descriptors) {
    if (typeof d !== 'string') {
      console.warn('[pickThemeFromDescriptors] Non-string descriptor found:', typeof d, d);
      continue;
    }
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
