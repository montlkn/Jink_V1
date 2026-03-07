/**
 * Brooklyn Bridge & Financial District Tour
 *
 * A narrative-driven guided tour experience demonstrating the full vision
 * of the architecture discovery app. Features:
 * - Linear progression through 8-10 checkpoints
 * - Mix of buildings, waypoints, and viewpoints
 * - AR skyline overlay at mid-span
 * - Pre-written content for reliable offline experience
 *
 * Duration: 45-60 min
 * Distance: ~2.1 miles
 */

export type CheckpointType = "building" | "waypoint" | "viewpoint";

export interface TourCheckpoint {
  id: string;
  type: CheckpointType;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  // For building type
  bin?: string;
  bbl?: string;
  // Content
  narrative: string;
  funFact?: string;
  action: string;
  // For viewpoints - AR overlay with building labels
  arOverlay?: {
    buildings: (string | {
      bin?: string;
      name: string;
      shortName?: string;
      bearing: number;
      elevation: number;
      info?: string;
    })[]; // BINs or full building objects for AR labels
  };
  // Building metadata (pre-populated for reliability)
  buildingData?: {
    architect?: string;
    yearBuilt?: string;
    style?: string;
    materials?: string;
    height?: string;
    floors?: number;
  };
  // Photos
  imageUrl?: string;
}

export interface Tour {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  duration: string;
  distance: string;
  difficulty: "easy" | "moderate" | "challenging";
  neighborhood: string;
  borough: string;
  coverImage?: string;
  checkpoints: TourCheckpoint[];
  completion: {
    xpReward: number;
    summary: string;
    badge?: {
      id: string;
      name: string;
      icon: string;
    };
  };
}

export const BROOKLYN_BRIDGE_TOUR: Tour = {
  id: "brooklyn-bridge-financial",
  name: "Brooklyn Bridge & Financial District",
  subtitle: "A walk through American architectural history",
  description:
    "Cross the iconic Brooklyn Bridge and explore the Financial District's most significant buildings, from Gothic Revival to Art Deco masterpieces.",
  duration: "45-60 min",
  distance: "2.1 miles",
  difficulty: "moderate",
  neighborhood: "Financial District",
  borough: "Manhattan",

  checkpoints: [
    {
      id: "start-brooklyn-bridge",
      type: "waypoint",
      name: "Brooklyn Bridge Entrance",
      location: {
        lat: 40.7061,
        lng: -73.9969,
      },
      narrative:
        "You're standing at the Manhattan entrance of the Brooklyn Bridge, completed in 1883. At the time of its opening, it was the longest suspension bridge in the world and the first to use steel cables. Chief Engineer Washington Roebling supervised construction from his Brooklyn apartment through a telescope after being struck with decompression sickness.",
      funFact:
        "On opening day, P.T. Barnum led 21 elephants across the bridge to prove it was safe.",
      action: "Start walking across the bridge",
    },
    {
      id: "midspan-viewpoint",
      type: "viewpoint",
      name: "Mid-Span Skyline View",
      location: {
        lat: 40.7057,
        lng: -73.9964,
      },
      narrative:
        "Turn and face Manhattan. The skyline before you represents over a century of American ambition in steel and stone. From here, you can see the evolution of the skyscraper, from the early towers of the 1900s to the supertall spires of today.",
      action: "Point camera at the Manhattan skyline",
      arOverlay: {
        buildings: [
          { name: "Woolworth Building", shortName: "Woolworth", bin: "1001831", bearing: 315, elevation: 12, info: "1913 Gothic Revival, once world's tallest" },
          { name: "Municipal Building", shortName: "Municipal", bin: "1001092", bearing: 330, elevation: 8, info: "1914 Beaux-Arts civic architecture" },
          { name: "One World Trade Center", shortName: "1 WTC", bin: "1000056", bearing: 280, elevation: 18, info: "2014 Supertall, 1,776 feet symbolic height" },
        ],
      },
    },
    {
      id: "brooklyn-tower",
      type: "waypoint",
      name: "Brooklyn Tower Gothic Arches",
      location: {
        lat: 40.7048,
        lng: -73.9958,
      },
      narrative:
        "The Brooklyn Tower's massive Gothic arches were designed by John Augustus Roebling to evoke the grandeur of European cathedrals. Each tower contains over 85,000 cubic yards of limestone, granite, and Rosendale cement—the same material used in the Capitol building.",
      funFact:
        "The towers were the tallest structures in the Western Hemisphere when built.",
      action: "Continue to City Hall area",
    },
    {
      id: "woolworth-building",
      type: "building",
      name: "Woolworth Building",
      location: {
        lat: 40.7123,
        lng: -74.0083,
      },
      bin: "1001831",
      narrative:
        "The 'Cathedral of Commerce' was the world's tallest building from 1913 to 1930. Frank Winfield Woolworth paid $13.5 million in cash—no mortgage—for its construction. The lobby features Byzantine-style mosaics, marble walls from the Greek island of Skyros, and a stained-glass ceiling.",
      funFact:
        "The lobby includes caricatures of Woolworth counting nickels and dimes, and architect Cass Gilbert cradling a model of the building.",
      action: "Scan to verify",
      buildingData: {
        architect: "Cass Gilbert",
        yearBuilt: "1913",
        style: "Neo-Gothic",
        materials: "Terracotta, Steel, Limestone",
        height: "792 ft",
        floors: 57,
      },
    },
    {
      id: "municipal-building",
      type: "building",
      name: "Manhattan Municipal Building",
      location: {
        lat: 40.7131,
        lng: -74.0048,
      },
      bin: "1001092",
      narrative:
        "One of the largest government buildings in the world, the Municipal Building was designed by McKim, Mead & White and completed in 1914. The 25-foot gilded statue 'Civic Fame' atop the building was the largest statue in Manhattan until the Statue of Liberty's torch was restored.",
      funFact:
        "The building spans Centre Street, with traffic passing through its grand archway.",
      action: "Scan to verify",
      buildingData: {
        architect: "McKim, Mead & White",
        yearBuilt: "1914",
        style: "Beaux-Arts",
        materials: "Granite, Limestone, Bronze",
        height: "580 ft",
        floors: 40,
      },
    },
    {
      id: "city-hall",
      type: "building",
      name: "New York City Hall",
      location: {
        lat: 40.7128,
        lng: -74.006,
      },
      bin: "1001093",
      narrative:
        "The seat of New York City government since 1812, City Hall is one of the oldest city halls in the United States still housing its original governmental functions. The French Renaissance design includes a central rotunda with a stunning coffered dome.",
      funFact:
        "The original building had no rear marble facade because city officials assumed New York would never expand north of City Hall.",
      action: "Scan to verify",
      buildingData: {
        architect: "Joseph-François Mangin & John McComb Jr.",
        yearBuilt: "1812",
        style: "French Renaissance Revival",
        materials: "Marble, Brownstone",
        floors: 3,
      },
    },
    {
      id: "tweed-courthouse",
      type: "building",
      name: "Tweed Courthouse",
      location: {
        lat: 40.7138,
        lng: -74.006,
      },
      bin: "1001094",
      narrative:
        "This Romanesque Revival courthouse became infamous as a symbol of Tammany Hall corruption. Originally budgeted at $250,000, the final cost exceeded $13 million due to kickbacks orchestrated by 'Boss' Tweed. Today, it houses the NYC Department of Education.",
      funFact:
        "The building took 20 years to complete (1861-1881), partly due to the Civil War.",
      action: "Scan to verify",
      buildingData: {
        architect: "John Kellum & Leopold Eidlitz",
        yearBuilt: "1881",
        style: "Romanesque Revival",
        materials: "Marble, Cast Iron",
        floors: 4,
      },
    },
    {
      id: "federal-hall",
      type: "building",
      name: "Federal Hall",
      location: {
        lat: 40.7074,
        lng: -74.0102,
      },
      bin: "1000477",
      narrative:
        "This is where George Washington took his oath of office as the first President of the United States in 1789. The current Greek Revival building (1842) features a grand rotunda modeled on the Parthenon. The statue of Washington on the steps marks the exact spot of his inauguration.",
      funFact:
        "The original Federal Hall was demolished in 1812; this building was originally a customs house.",
      action: "Scan to verify",
      buildingData: {
        architect: "Ithiel Town & Alexander Jackson Davis",
        yearBuilt: "1842",
        style: "Greek Revival",
        materials: "Marble, Bronze",
        floors: 3,
      },
    },
    {
      id: "trinity-church",
      type: "building",
      name: "Trinity Church",
      location: {
        lat: 40.7081,
        lng: -74.0122,
      },
      bin: "1000483",
      narrative:
        "Trinity Church has stood at the head of Wall Street since 1697 (current building 1846). Its 281-foot spire was once the tallest point in New York City. The churchyard contains the graves of Alexander Hamilton and other Revolutionary War figures.",
      funFact:
        "Queen Anne granted Trinity Church land in 1705 that is now worth an estimated $6 billion.",
      action: "Scan to verify",
      buildingData: {
        architect: "Richard Upjohn",
        yearBuilt: "1846",
        style: "Gothic Revival",
        materials: "Brownstone, Bronze doors",
        height: "281 ft (spire)",
      },
    },
    {
      id: "one-wall-street",
      type: "building",
      name: "One Wall Street",
      location: {
        lat: 40.7068,
        lng: -74.0115,
      },
      bin: "1000484",
      narrative:
        "This Art Deco masterpiece was completed in 1931 as the headquarters of Irving Trust. The building's distinctive facade features over 650,000 hand-set pieces of limestone arranged in a flame-like pattern. The interior Red Room is one of NYC's most spectacular Art Deco spaces.",
      funFact:
        "The building was designed to maximize natural light by stepping back from the street.",
      action: "Scan to verify",
      buildingData: {
        architect: "Ralph Walker (Voorhees, Gmelin & Walker)",
        yearBuilt: "1931",
        style: "Art Deco",
        materials: "Limestone, Glass",
        height: "654 ft",
        floors: 50,
      },
    },
  ],

  completion: {
    xpReward: 500,
    summary:
      "You've explored 8 buildings spanning 200 years of New York architecture, from Federal-era civic buildings to Art Deco skyscrapers. Your aesthetic profile has been enriched with insights about Gothic Revival, Beaux-Arts, and Art Deco styles.",
    badge: {
      id: "brooklyn-bridge-pioneer",
      name: "Bridge Pioneer",
      icon: "🌉",
    },
  },
};

// Export lookup function for tour buildings
export function getTourBuildingByLocation(
  lat: number,
  lng: number,
  radiusKm: number = 0.03 // 30m
): TourCheckpoint | null {
  const tour = BROOKLYN_BRIDGE_TOUR;

  for (const checkpoint of tour.checkpoints) {
    if (checkpoint.type !== "building") continue;

    const distance = haversineDistance(
      lat,
      lng,
      checkpoint.location.lat,
      checkpoint.location.lng
    );

    if (distance <= radiusKm) {
      return checkpoint;
    }
  }

  return null;
}

export function getTourBuildingByBIN(bin: string): TourCheckpoint | null {
  const cleanBin = String(bin).replace(/\.0$/, "");
  const tour = BROOKLYN_BRIDGE_TOUR;

  for (const checkpoint of tour.checkpoints) {
    if (checkpoint.bin && checkpoint.bin === cleanBin) {
      return checkpoint;
    }
  }

  return null;
}

// Helper function
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
