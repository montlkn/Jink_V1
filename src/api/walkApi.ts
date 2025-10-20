import { Platform } from "react-native";

import type { GeoJsonFeature, WalkGeometry, WalkSummary } from "../types/walks";
import { supabase } from "./supabaseClient";

const FALLBACK_SUMMARIES: WalkSummary[] = [
  {
    id: "demo-soho",
    startedAt: "2024-02-10T14:05:00Z",
    endedAt: "2024-02-10T15:10:00Z",
    distanceKm: 2.6,
    borough: "Manhattan",
  },
  {
    id: "demo-midtown",
    startedAt: "2024-01-22T19:00:00Z",
    endedAt: "2024-01-22T20:25:00Z",
    distanceKm: 3.1,
    borough: "Manhattan",
  },
];

const FALLBACK_GEOMETRIES: Record<string, WalkGeometry> = {
  "demo-soho": {
    walkId: "demo-soho",
    route: [
      { latitude: 40.72415, longitude: -74.00209 },
      { latitude: 40.72484, longitude: -73.99912 },
      { latitude: 40.72278, longitude: -73.99811 },
      { latitude: 40.72205, longitude: -74.00123 },
      { latitude: 40.72363, longitude: -74.00265 },
    ],
    buildings: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-74.00212, 40.72433],
              [-74.00151, 40.72433],
              [-74.00151, 40.72392],
              [-74.00212, 40.72392],
              [-74.00212, 40.72433],
            ],
          ],
        },
        properties: {
          id: "cast-iron-building",
          name: "E. V. Haughwout Building",
          era: "Cast Iron",
        },
      } as GeoJsonFeature,
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-74.00091, 40.72315],
              [-74.00037, 40.72315],
              [-74.00037, 40.72273],
              [-74.00091, 40.72273],
              [-74.00091, 40.72315],
            ],
          ],
        },
        properties: {
          id: "soho-loft",
          name: "SoHo Loft Block",
        },
      } as GeoJsonFeature,
    ],
  },
  "demo-midtown": {
    walkId: "demo-midtown",
    route: [
      { latitude: 40.75873, longitude: -73.97868 },
      { latitude: 40.75795, longitude: -73.98161 },
      { latitude: 40.75529, longitude: -73.98063 },
      { latitude: 40.75609, longitude: -73.97755 },
      { latitude: 40.75804, longitude: -73.97783 },
    ],
    buildings: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-73.97297, 40.75866],
              [-73.97236, 40.75866],
              [-73.97236, 40.75815],
              [-73.97297, 40.75815],
              [-73.97297, 40.75866],
            ],
          ],
        },
        properties: {
          id: "seagram-building",
          name: "Seagram Building",
        },
      } as GeoJsonFeature,
    ],
  },
};

const SUMMARIES_FUNCTION = "past-walk-summaries";
const GEOMETRY_FUNCTION = "past-walk-geometry";

const resolveEnv = () => {
  if (typeof globalThis === "undefined") {
    return {} as Record<string, string | undefined>;
  }

  const guessedProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;

  return guessedProcess?.env ?? {};
};

const env = resolveEnv();

const shouldUseDemoWalks =
  (typeof __DEV__ !== "undefined" && __DEV__) && env.EXPO_PUBLIC_USE_DEMO_WALKS === "1";

function warnFallback(scope: "summaries" | "geometry", detail: unknown): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[walkApi] Falling back to demo ${scope}.`, detail);
  }
}

export async function getPastWalkSummaries(userId?: string | null): Promise<WalkSummary[]> {
  if (!userId) {
    warnFallback("summaries", "Missing user id");
    return FALLBACK_SUMMARIES;
  }

  if (shouldUseDemoWalks) {
    return FALLBACK_SUMMARIES;
  }

  try {
    const { data, error } = await supabase.functions.invoke<WalkSummary[]>(SUMMARIES_FUNCTION, {
      body: { userId, platform: Platform.OS },
    });
    if (error) throw error;
    return Array.isArray(data) && data.length > 0 ? data : [];
  } catch (error) {
    warnFallback("summaries", error);
    return FALLBACK_SUMMARIES;
  }
}

export async function getPastWalkGeometry(walkId: string): Promise<WalkGeometry> {
  if (!walkId) {
    throw new Error("walkId is required");
  }

  if (shouldUseDemoWalks) {
    return FALLBACK_GEOMETRIES[walkId] ?? FALLBACK_GEOMETRIES["demo-soho"];
  }

  try {
    const { data, error } = await supabase.functions.invoke<WalkGeometry>(GEOMETRY_FUNCTION, {
      body: { walkId, platform: Platform.OS, tolerance: 0.00005 },
    });
    if (error) throw error;
    if (!data) throw new Error("No geometry returned");
    return data;
  } catch (error) {
    warnFallback("geometry", error);
    return FALLBACK_GEOMETRIES[walkId] ?? FALLBACK_GEOMETRIES["demo-soho"];
  }
}
