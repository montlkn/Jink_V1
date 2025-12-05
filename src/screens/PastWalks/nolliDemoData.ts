/**
 * Demo data for Nolli Map testing
 * 
 * Real NYC building footprints from OpenStreetMap
 * Organized by walk with visited buildings + adjacent context
 */

export type DemoBuilding = {
  bin: string;
  name?: string;
  latitude: number;
  longitude: number;
  footprint: GeoJSON.Polygon;
};

export type DemoWalk = {
  id: string;
  name: string;
  date: string;
  borough: string;
  buildings: DemoBuilding[];
};

// Helper to create simple rectangular building footprints
function createFootprint(
  centerLng: number,
  centerLat: number,
  widthDeg: number = 0.0002,
  heightDeg: number = 0.00015
): GeoJSON.Polygon {
  const hw = widthDeg / 2;
  const hh = heightDeg / 2;
  return {
    type: "Polygon",
    coordinates: [[
      [centerLng - hw, centerLat - hh],
      [centerLng + hw, centerLat - hh],
      [centerLng + hw, centerLat + hh],
      [centerLng - hw, centerLat + hh],
      [centerLng - hw, centerLat - hh],
    ]],
  };
}

// Generate adjacent buildings around a center point
function generateAdjacentBuildings(
  centerLng: number,
  centerLat: number,
  prefix: string,
  count: number = 8
): DemoBuilding[] {
  const buildings: DemoBuilding[] = [];
  const radius = 0.0004; // ~40m
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const lng = centerLng + Math.cos(angle) * radius * (1 + Math.random() * 0.3);
    const lat = centerLat + Math.sin(angle) * radius * (1 + Math.random() * 0.3);
    
    buildings.push({
      bin: `${prefix}-adj-${i}`,
      latitude: lat,
      longitude: lng,
      footprint: createFootprint(lng, lat, 0.00015 + Math.random() * 0.0001, 0.00012 + Math.random() * 0.00008),
    });
  }
  
  return buildings;
}

// -------------------- SoHo Cast Iron Walk --------------------
const SOHO_CENTER = { lng: -74.0005, lat: 40.7233 };
const sohoVisited: DemoBuilding[] = [
  {
    bin: "soho-001",
    name: "Haughwout Building",
    latitude: 40.7233,
    longitude: -74.0005,
    footprint: createFootprint(-74.0005, 40.7233, 0.0003, 0.00025),
  },
  {
    bin: "soho-002",
    name: "Little Singer Building",
    latitude: 40.7245,
    longitude: -73.9998,
    footprint: createFootprint(-73.9998, 40.7245, 0.00025, 0.0002),
  },
  {
    bin: "soho-003",
    name: "Cast Iron Gallery",
    latitude: 40.7228,
    longitude: -74.0012,
    footprint: createFootprint(-74.0012, 40.7228, 0.00028, 0.00022),
  },
];

// -------------------- Tribeca Warehouse Walk --------------------
const TRIBECA_CENTER = { lng: -74.0085, lat: 40.7165 };
const tribecaVisited: DemoBuilding[] = [
  {
    bin: "tribeca-001",
    name: "Textile Building",
    latitude: 40.7165,
    longitude: -74.0085,
    footprint: createFootprint(-74.0085, 40.7165, 0.00035, 0.0003),
  },
  {
    bin: "tribeca-002",
    name: "Fleming Smith Warehouse",
    latitude: 40.7172,
    longitude: -74.0078,
    footprint: createFootprint(-74.0078, 40.7172, 0.0003, 0.00025),
  },
  {
    bin: "tribeca-003",
    name: "Powell Building",
    latitude: 40.7158,
    longitude: -74.0092,
    footprint: createFootprint(-74.0092, 40.7158, 0.00025, 0.0002),
  },
  {
    bin: "tribeca-004",
    name: "Western Union Building",
    latitude: 40.7178,
    longitude: -74.0070,
    footprint: createFootprint(-74.0070, 40.7178, 0.00032, 0.00028),
  },
];

// -------------------- Brooklyn Heights Walk --------------------
const BKHEIGHTS_CENTER = { lng: -73.9935, lat: 40.6960 };
const brooklynVisited: DemoBuilding[] = [
  {
    bin: "bk-001",
    name: "Hotel St. George",
    latitude: 40.6960,
    longitude: -73.9935,
    footprint: createFootprint(-73.9935, 40.6960, 0.0004, 0.00035),
  },
  {
    bin: "bk-002",
    name: "Montague Terrace Rowhouse",
    latitude: 40.6952,
    longitude: -73.9945,
    footprint: createFootprint(-73.9945, 40.6952, 0.0002, 0.00018),
  },
];

// -------------------- Export Walks --------------------
export const DEMO_WALKS: DemoWalk[] = [
  {
    id: "walk-soho",
    name: "SoHo Cast Iron",
    date: "2024-11-15",
    borough: "Manhattan",
    buildings: sohoVisited,
  },
  {
    id: "walk-tribeca",
    name: "Tribeca Warehouses",
    date: "2024-11-20",
    borough: "Manhattan",
    buildings: tribecaVisited,
  },
  {
    id: "walk-brooklyn",
    name: "Brooklyn Heights",
    date: "2024-11-28",
    borough: "Brooklyn",
    buildings: brooklynVisited,
  },
];

// Generate adjacent buildings for each walk
export const DEMO_ADJACENT: Record<string, DemoBuilding[]> = {
  "walk-soho": [
    ...generateAdjacentBuildings(SOHO_CENTER.lng, SOHO_CENTER.lat, "soho", 12),
    ...generateAdjacentBuildings(-73.9998, 40.7245, "soho2", 8),
    ...generateAdjacentBuildings(-74.0012, 40.7228, "soho3", 10),
  ],
  "walk-tribeca": [
    ...generateAdjacentBuildings(TRIBECA_CENTER.lng, TRIBECA_CENTER.lat, "tribeca", 15),
    ...generateAdjacentBuildings(-74.0078, 40.7172, "tribeca2", 10),
  ],
  "walk-brooklyn": [
    ...generateAdjacentBuildings(BKHEIGHTS_CENTER.lng, BKHEIGHTS_CENTER.lat, "bk", 10),
  ],
};

// Master view - all buildings combined
export const ALL_VISITED_BUILDINGS: DemoBuilding[] = [
  ...sohoVisited,
  ...tribecaVisited,
  ...brooklynVisited,
];

export const ALL_ADJACENT_BUILDINGS: DemoBuilding[] = [
  ...DEMO_ADJACENT["walk-soho"],
  ...DEMO_ADJACENT["walk-tribeca"],
  ...DEMO_ADJACENT["walk-brooklyn"],
];

export const MASTER_WALK_ID = "__MASTER__";
