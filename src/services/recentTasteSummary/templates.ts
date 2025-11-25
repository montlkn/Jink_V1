export type TasteTemplate = {
  template: string;
  category: "discovery" | "pattern" | "evolution" | "streak" | "mystery";
  requiredData: ("streak" | "location" | "scanCount" | "archetype" | "descriptor")[];
  weight: number; // Higher weight = preferred when multiple templates match
};

export const TASTE_TEMPLATES: TasteTemplate[] = [
  // Discovery templates (5)
  {
    template: "You're developing an eye for {descriptor} {archetype} details",
    category: "discovery",
    requiredData: ["descriptor", "archetype"],
    weight: 3,
  },
  {
    template: "Your {location} explorations reveal a taste for {theme}",
    category: "discovery",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "After {scanCount} scans, {descriptor} facades are calling to you",
    category: "discovery",
    requiredData: ["scanCount", "descriptor"],
    weight: 5,
  },
  {
    template: "You're drawn to something {descriptor} in {location}",
    category: "discovery",
    requiredData: ["descriptor", "location"],
    weight: 4,
  },
  {
    template: "Your eye keeps finding {descriptor} {theme}",
    category: "discovery",
    requiredData: ["descriptor", "archetype"],
    weight: 3,
  },

  // Pattern templates (5)
  {
    template: "Your walks keep returning to {descriptor} buildings",
    category: "pattern",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "{location} streets show your preference for {archetype} style",
    category: "pattern",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "There's a {theme} thread in your recent {scanCount} scans",
    category: "pattern",
    requiredData: ["archetype", "scanCount"],
    weight: 5,
  },
  {
    template: "Your recent walks hint at {archetype} sensibilities",
    category: "pattern",
    requiredData: ["archetype"],
    weight: 3,
  },
  {
    template: "You keep discovering {descriptor} moments in {location}",
    category: "pattern",
    requiredData: ["descriptor", "location"],
    weight: 4,
  },

  // Evolution templates (5)
  {
    template: "Something's shifting—more {descriptor} {style} lately",
    category: "evolution",
    requiredData: ["descriptor", "archetype"],
    weight: 4,
  },
  {
    template: "Your taste is moving toward {archetype} {theme}",
    category: "evolution",
    requiredData: ["archetype"],
    weight: 3,
  },
  {
    template: "This week: {scanCount} buildings with {descriptor} character",
    category: "evolution",
    requiredData: ["scanCount", "descriptor"],
    weight: 5,
  },
  {
    template: "Lately you're finding {descriptor} details everywhere",
    category: "evolution",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "Your {location} walks are revealing {archetype} patterns",
    category: "evolution",
    requiredData: ["location", "archetype"],
    weight: 4,
  },

  // Streak/Engagement templates (5)
  {
    template: "Your {streak}-day streak reveals a weakness for {descriptor} details",
    category: "streak",
    requiredData: ["streak", "descriptor"],
    weight: 6,
  },
  {
    template: "{streak} days of {archetype} discoveries across {location}",
    category: "streak",
    requiredData: ["streak", "archetype", "location"],
    weight: 7,
  },
  {
    template: "After {scanCount} scans, your {archetype} instincts are sharpening",
    category: "streak",
    requiredData: ["scanCount", "archetype"],
    weight: 5,
  },
  {
    template: "{streak} days in, you're drawn to {descriptor} {theme}",
    category: "streak",
    requiredData: ["streak", "descriptor", "archetype"],
    weight: 6,
  },
  {
    template: "Day {streak}: still finding new {descriptor} facades",
    category: "streak",
    requiredData: ["streak", "descriptor"],
    weight: 5,
  },

  // Mystery/Intrigue templates (5)
  {
    template: "There's a {theme} quality to your {scanCount} recent scans",
    category: "mystery",
    requiredData: ["archetype", "scanCount"],
    weight: 4,
  },
  {
    template: "Something {descriptor} is catching your attention",
    category: "mystery",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "Your {location} walks whisper {archetype} preferences",
    category: "mystery",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "You're collecting {descriptor} moments without realizing it",
    category: "mystery",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "A pattern emerges: {descriptor} {theme} in {location}",
    category: "mystery",
    requiredData: ["descriptor", "archetype", "location"],
    weight: 5,
  },
];

export type TemplateData = {
  archetype: string;
  descriptor: string;
  theme: string;
  location: string | null;
  scanCount: number | null;
  streak: number | null;
  style: string;
};
