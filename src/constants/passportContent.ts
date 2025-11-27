import type { ImageSourcePropType } from "react-native";

export type StampDefinition = {
  id: string;
  title: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  issuedAt: string;
  description: string;
  source: string;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  purpose: string;
  xp: number;
  missable: boolean;
  verification: string;
};

export type VisaDefinition = {
  id: string;
  title: string;
  neighborhood: string;
  grantedAt: string;
  requirement: string;
  description: string;
  accent: string;
};

export type BuildingDetail = {
  id: string;
  name: string;
  address: string;
  style: string;
  year: string;
  summary: string;
  image?: ImageSourcePropType;
  architect?: string;
  materials?: string;
  use?: string;
  type?: string;
  description?: string;
};

export type PassportListDefinition = {
  id: string;
  name: string;
  tagline: string;
  prompt: string;
  mood: string;
  buildings: BuildingDetail[];
};

export const stampCollection: StampDefinition[] = [
  {
    id: "flatiron-first",
    title: "Flatiron First Scan",
    rarity: "common",
    issuedAt: "2024-06-21",
    description:
      "Building Stamp • Awarded for scanning the Flatiron Building for the first time.",
    source: "Building scan",
  },
  {
    id: "quest-midtown",
    title: "Quest: Midtown Marvels",
    rarity: "rare",
    issuedAt: "2024-08-05",
    description:
      "Quest Stamp • Completed every Midtown Marvels clue before the quest timed out.",
    source: "Quest completion",
  },
  {
    id: "achievement-first-scan",
    title: "Achievement: First Scan",
    rarity: "epic",
    issuedAt: "2023-12-11",
    description:
      "Achievement Stamp • Marked your very first building scan in the city.",
    source: "Achievement unlock",
  },
  {
    id: "legendary-ticker",
    title: "Ticker Tape Legend",
    rarity: "legendary",
    issuedAt: "2024-02-19",
    description:
      "Legendary Stamp • Selected by the atelier jury during the Winter Ledger showcase.",
    source: "Curated showcase",
  },
  {
    id: "quest-dumbo",
    title: "Quest: DUMBO Steel",
    rarity: "rare",
    issuedAt: "2024-04-15",
    description:
      "Quest Stamp • Collected during the limited-run DUMBO Steel field quest.",
    source: "Quest completion",
  },
  {
    id: "oracle-aia",
    title: "AIA Open House",
    rarity: "common",
    issuedAt: "2024-10-08",
    description:
      "Building Stamp • Earned for checking into the AIA Open House tour checkpoint.",
    source: "Event check-in",
  },
  {
    id: "achievement-perfect-week",
    title: "Achievement: Perfect Week",
    rarity: "epic",
    issuedAt: "2024-05-03",
    description: "Achievement Stamp • 7 consecutive daily quest completions.",
    source: "Achievement unlock",
  },
  {
    id: "legendary-collection-master",
    title: "Collection Master",
    rarity: "legendary",
    issuedAt: "2024-06-30",
    description:
      "Legendary Stamp • Granted for completing every archival quest variant in a chapter.",
    source: "Collection mastery",
  },
];

export const achievementLedger: AchievementDefinition[] = [
  {
    id: "first_scan",
    title: "First Scan",
    purpose: "Scan your first building to prove you’ve started exploring.",
    xp: 25,
    missable: false,
    verification:
      "Unlocks once any building scan is recorded for your profile.",
  },
  {
    id: "100_scans",
    title: "100 Unique Scans",
    purpose: "Encourages breadth—visit 100 distinct buildings.",
    xp: 500,
    missable: false,
    verification:
      "Checks for 100 distinct building scans logged under your account.",
  },
  {
    id: "style_explorer_modern",
    title: "Modern Explorer",
    purpose: "Visit ten Modernist buildings to understand the style in depth.",
    xp: 200,
    missable: false,
    verification:
      "Validates 10 Modern-style buildings scanned via the architectural dataset.",
  },
  {
    id: "dedicated_traveler",
    title: "Dedicated Traveler",
    purpose: "Complete a single derive or jink that lasts at least 90 minutes.",
    xp: 200,
    missable: false,
    verification: "Looks for a derive session with duration >= 90 minutes.",
  },
  {
    id: "perfect_week",
    title: "Perfect Week",
    purpose: "Seven daily quests in a row—time-boxed and missable.",
    xp: 1200,
    missable: true,
    verification: "Requires a seven-day streak of completed daily quests.",
  },
  {
    id: "dawn_scanner",
    title: "Dawn Scanner",
    purpose: "Finish a daily quest before 08:00 local time.",
    xp: 150,
    missable: true,
    verification:
      "Confirms a completed quest with completion time before 08:00.",
  },
  {
    id: "collection_champion",
    title: "Collection Champion",
    purpose:
      "Collect every quest stamp in a complete collection—extremely rare.",
    xp: 10000,
    missable: true,
    verification:
      "Validates ownership of all quest variant stamps in a collection.",
  },
  {
    id: "first_visa",
    title: "First Visa",
    purpose: "Earn your first neighborhood visa and cement local credentials.",
    xp: 100,
    missable: false,
    verification:
      "Granted once any entry exists in user_visas for your account.",
  },
];

export const visaCarousel: VisaDefinition[] = [
  {
    id: "midtown",
    title: "Midtown Marvels Visa",
    neighborhood: "Midtown",
    grantedAt: "2024-07-12",
    requirement: "Scan 12 landmark towers between 34th Street and 59th Street.",
    description:
      "Issued after you walked the Midtown canyon, capturing deco crowns and glass spires.",
    accent: "#2D5B91",
  },
  {
    id: "bedstuy",
    title: "Bed-Stuy Brownstone Visa",
    neighborhood: "Bedford–Stuyvesant",
    grantedAt: "2024-05-28",
    requirement:
      "Visit 10 distinct stoops in the Stuyvesant Heights landmark district.",
    description:
      "Awarded for knowing the blocks by heart—detailing lintels, cornices, and backyard stories.",
    accent: "#8B4A2D",
  },
  {
    id: "lic",
    title: "LIC Waterfront Visa",
    neighborhood: "Long Island City",
    grantedAt: "2024-09-03",
    requirement: "Complete three twilight derives along the Queens waterfront.",
    description:
      "You traced the gantries and silos at dusk—documenting rail relics and neon glow.",
    accent: "#1F8A70",
  },
];

export const passportLists: PassportListDefinition[] = [
  {
    id: "deco-giants",
    name: "Deco Giants",
    tagline: "Where steel meets style.",
    prompt: "Add to list!",
    mood: "Polished chrome, sunrise reflections, and lobby murals.",
    buildings: [
      {
        id: "chrysler",
        name: "Chrysler Building",
        address: "405 Lexington Ave",
        style: "Art Deco",
        year: "1930",
        summary:
          "Iconic crown with radiating metal arches and automotive gargoyles.",
      },
      {
        id: "ge",
        name: "570 Lexington",
        address: "570 Lexington Ave",
        style: "Art Deco",
        year: "1931",
        summary: "Red brick tower with limestone tracery and spire lantern.",
      },
      {
        id: "30rock",
        name: "30 Rockefeller Plaza",
        address: "45 Rockefeller Plaza",
        style: "Art Deco",
        year: "1933",
        summary:
          "Massed limestone with sculpted reliefs and soaring observation deck.",
      },
      {
        id: "citybank",
        name: "City Bank-Farmers Trust",
        address: "20 Exchange Pl",
        style: "Art Deco",
        year: "1931",
        summary:
          "Tiered ziggurat silhouette with bronze doors and stylized eagles.",
      },
      {
        id: "walker",
        name: "Walker Tower",
        address: "212 W 18th St",
        style: "Art Deco",
        year: "1929",
        summary: "Chelsea telegraph HQ reborn with terracotta chevron panels.",
      },
    ],
  },
  {
    id: "industrial-poetics",
    name: "Industrial Poetics",
    tagline: "Factories that hum with rhythm.",
    prompt: "Add to list!",
    mood: "Riveted beams, brick soot, mechanical grace notes.",
    buildings: [
      {
        id: "dumbo-warehouse",
        name: "Empire Stores",
        address: "55 Water St",
        style: "Warehouse Revival",
        year: "1869",
        summary:
          "Civil War coffee warehouse—brick vaults with Brooklyn Bridge framed.",
      },
      {
        id: "neon-pepsi",
        name: "Pepsi-Cola Sign",
        address: "4-09 47th Rd",
        style: "Industrial Neon",
        year: "1936",
        summary:
          "Floating red neon script anchored to a converted bottling plant.",
      },
      {
        id: "knitting-factory",
        name: "Brooklyn Navy Yard - Building 77",
        address: "141 Flushing Ave",
        style: "Streamline Moderne",
        year: "1942",
        summary:
          "Re-skinned supply depot with stepped glass curtain and roof farm.",
      },
      {
        id: "sugar",
        name: "Domino Sugar Refinery",
        address: "292 Kent Ave",
        style: "Romanesque Industrial",
        year: "1884",
        summary: "Landmark brick refinery reimagined with glass barrel insert.",
      },
    ],
  },
  {
    id: "brutalist-beacons",
    name: "Brutalist Beacons",
    tagline: "Concrete poetry of the late modern city.",
    prompt: "Add to list!",
    mood: "Board-formed concrete, heroic stairs, softened with sky gardens.",
    buildings: [
      {
        id: "met-breuer",
        name: "The Met Breuer",
        address: "945 Madison Ave",
        style: "Brutalist",
        year: "1966",
        summary:
          "Marcel Breuer’s inverted ziggurat with bush-hammered concrete façade.",
      },
      {
        id: "lincoln-center",
        name: "Lincoln Center Library",
        address: "40 Lincoln Center Plaza",
        style: "Brutalist",
        year: "1965",
        summary: "Low-slung mass with slender light wells and recessed plaza.",
      },
      {
        id: "hunter",
        name: "Hunter College Library",
        address: "695 Park Ave",
        style: "Brutalist",
        year: "1984",
        summary: "Angular tower carved by terraces and raw concrete fins.",
      },
      {
        id: "lehman",
        name: "Lehman College Art Gallery",
        address: "250 Bedford Park Blvd W",
        style: "Brutalist",
        year: "1968",
        summary:
          "Cantilevered mass hovering over a reflecting pool with ribbed soffits.",
      },
    ],
  },
  {
    id: "seaside-escape",
    name: "Seaside Escape",
    tagline: "Buildings tuned to the Atlantic breeze.",
    prompt: "Add to list!",
    mood: "Bleached concrete, salt-crusted steel, and cooling canopies.",
    buildings: [
      {
        id: "rockaways",
        name: "Rockaway Beach Skate Pavilion",
        address: "94-00 Shore Front Pkwy",
        style: "Coastal Modern",
        year: "2017",
        summary:
          "Wave-like canopy in galvanized steel with skate ribbon below.",
      },
      {
        id: "coney",
        name: "Coney Island Steeplechase Plaza",
        address: "1904 Surf Ave",
        style: "Adaptive Reuse",
        year: "2013",
        summary:
          "Historic parachute jump framed with new timber decks and views.",
      },
      {
        id: "sunset-harbor",
        name: "Sunset Cove Nature Center",
        address: "Bayview Ave, Broad Channel",
        style: "Sustainable",
        year: "2020",
        summary:
          "Resilient wetlands pavilion with passive ventilation corridors.",
      },
      {
        id: "st-george",
        name: "Empire Outlets Canopy",
        address: "55 Richmond Ter",
        style: "Contemporary",
        year: "2019",
        summary: "Sculpted canopy capturing harbor winds with LED nightwash.",
      },
    ],
  },
];
