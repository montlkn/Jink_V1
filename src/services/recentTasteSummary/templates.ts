export type TasteTemplate = {
  template: string;
  category: "discovery" | "pattern" | "evolution" | "streak" | "mystery";
  requiredData:
    ("streak" | "location" | "scanCount" | "archetype" | "descriptor")[];
  weight: number; // Higher weight = preferred when multiple templates match
};

export const TASTE_TEMPLATES: TasteTemplate[] = [
  // Discovery templates (5)
  {
    template: "You're drawn to {descriptor} {archetype} architecture",
    category: "discovery",
    requiredData: ["descriptor", "archetype"],
    weight: 3,
  },
  {
    template:
      "Your {location} walks show a preference for {archetype} buildings",
    category: "discovery",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "{scanCount} scans in, you're noticing {descriptor} facades",
    category: "discovery",
    requiredData: ["scanCount", "descriptor"],
    weight: 5,
  },
  {
    template:
      "Something about {descriptor} keeps catching your eye in {location}",
    category: "discovery",
    requiredData: ["descriptor", "location"],
    weight: 4,
  },
  {
    template: "You're consistently finding {descriptor} {archetype} details",
    category: "discovery",
    requiredData: ["descriptor", "archetype"],
    weight: 3,
  },

  // Pattern templates (5)
  {
    template: "A pattern: you're gravitating toward {descriptor} buildings",
    category: "pattern",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "Your {location} walks reveal a {archetype} sensibility",
    category: "pattern",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "Your last {scanCount} scans lean {archetype}",
    category: "pattern",
    requiredData: ["archetype", "scanCount"],
    weight: 5,
  },
  {
    template: "You're developing {archetype} instincts",
    category: "pattern",
    requiredData: ["archetype"],
    weight: 3,
  },
  {
    template: "{location} keeps showing you {descriptor} architecture",
    category: "pattern",
    requiredData: ["descriptor", "location"],
    weight: 4,
  },

  // Evolution templates (5)
  {
    template: "Your taste is shifting toward {descriptor} {style}",
    category: "evolution",
    requiredData: ["descriptor", "archetype"],
    weight: 4,
  },
  {
    template: "Lately, more {archetype} architecture",
    category: "evolution",
    requiredData: ["archetype"],
    weight: 3,
  },
  {
    template: "This week: {scanCount} {descriptor} buildings scanned",
    category: "evolution",
    requiredData: ["scanCount", "descriptor"],
    weight: 5,
  },
  {
    template: "You're noticing {descriptor} details more often",
    category: "evolution",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "Your {location} explorations lean {archetype}",
    category: "evolution",
    requiredData: ["location", "archetype"],
    weight: 4,
  },

  // Streak/Engagement templates (5)
  {
    template: "{streak} days of exploring {descriptor} architecture",
    category: "streak",
    requiredData: ["streak", "descriptor"],
    weight: 6,
  },
  {
    template: "{streak}-day streak across {location}, finding {archetype} gems",
    category: "streak",
    requiredData: ["streak", "archetype", "location"],
    weight: 7,
  },
  {
    template: "{scanCount} scans deep, your {archetype} eye is developing",
    category: "streak",
    requiredData: ["scanCount", "archetype"],
    weight: 5,
  },
  {
    template: "Day {streak}: drawn to {descriptor} {archetype} buildings",
    category: "streak",
    requiredData: ["streak", "descriptor", "archetype"],
    weight: 6,
  },
  {
    template: "{streak} days in, still discovering {descriptor} facades",
    category: "streak",
    requiredData: ["streak", "descriptor"],
    weight: 5,
  },

  // Mystery/Intrigue templates (5)
  {
    template: "Your last {scanCount} scans show {archetype} leanings",
    category: "mystery",
    requiredData: ["archetype", "scanCount"],
    weight: 4,
  },
  {
    template: "{descriptor} buildings keep catching your eye",
    category: "mystery",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "Your {location} walks hint at {archetype} taste",
    category: "mystery",
    requiredData: ["location", "archetype"],
    weight: 4,
  },
  {
    template: "You're drawn to {descriptor} architecture more than you realize",
    category: "mystery",
    requiredData: ["descriptor"],
    weight: 3,
  },
  {
    template: "{location}: a taste for {archetype} architecture",
    category: "mystery",
    requiredData: ["archetype", "location"],
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
