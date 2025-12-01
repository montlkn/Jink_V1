/**
 * OSRM (Open Source Routing Machine) Service
 * Provides accurate walking route calculations using real street networks
 *
 * Using public demo server (free, no API key needed)
 * For production: Self-host with Docker or use paid service
 */

import { log } from "@/lib/log";

const OSRM_SERVER = "https://router.project-osrm.org";

export type OSRMCoordinate = {
  latitude: number;
  longitude: number;
};

export type OSRMRoute = {
  distance: number; // meters
  duration: number; // seconds
  geometry: string; // encoded polyline
};

export type OSRMRouteResponse = {
  code: string;
  routes: OSRMRoute[];
  waypoints: any[];
};

/**
 * Calculate walking route between two points
 * @returns Distance in km and duration in minutes
 */
export async function getWalkingRoute(
  from: OSRMCoordinate,
  to: OSRMCoordinate,
): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    // OSRM uses lon,lat order (not lat,lon!)
    const coords =
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;

    const url =
      `${OSRM_SERVER}/route/v1/foot/${coords}?overview=false&alternatives=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      log.warn("[osrm] Route request failed", { status: response.status });
      return null;
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      log.warn("[osrm] No route found", { code: data.code });
      return null;
    }

    const route = data.routes[0];

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    log.error("[osrm] Error fetching route", error);
    return null;
  }
}

/**
 * Calculate walking route through multiple waypoints
 * @returns Total distance in km and duration in minutes
 */
export async function getMultiPointRoute(
  waypoints: OSRMCoordinate[],
): Promise<
  {
    distanceKm: number;
    durationMin: number;
    legs: { distanceKm: number; durationMin: number }[];
  } | null
> {
  try {
    if (waypoints.length < 2) {
      log.warn("[osrm] Need at least 2 waypoints");
      return null;
    }

    // OSRM uses lon,lat order
    const coords = waypoints
      .map((w) => `${w.longitude},${w.latitude}`)
      .join(";");

    const url =
      `${OSRM_SERVER}/route/v1/foot/${coords}?overview=false&alternatives=false&steps=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      log.warn("[osrm] Multi-point route request failed", {
        status: response.status,
      });
      return null;
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      log.warn("[osrm] No multi-point route found", { code: data.code });
      return null;
    }

    const route = data.routes[0];

    // Parse legs for segment-by-segment analysis
    const legs = (route as any).legs?.map((leg: any) => ({
      distanceKm: leg.distance / 1000,
      durationMin: leg.duration / 60,
    })) || [];

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      legs,
    };
  } catch (error) {
    log.error("[osrm] Error fetching multi-point route", error);
    return null;
  }
}

/**
 * Fallback: Simple haversine distance calculation
 * Used when OSRM is unavailable or for quick estimates
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate walking time from distance
 * Uses average walking speed of 4.5 km/h
 */
export function estimateWalkingTime(distanceKm: number): number {
  const WALKING_SPEED_KMH = 4.5;
  return (distanceKm / WALKING_SPEED_KMH) * 60; // minutes
}

/**
 * Get walking route with fallback to haversine
 * @returns Always returns a result (OSRM or estimated)
 */
export async function getWalkingRouteWithFallback(
  from: OSRMCoordinate,
  to: OSRMCoordinate,
): Promise<
  { distanceKm: number; durationMin: number; source: "osrm" | "haversine" }
> {
  // Try OSRM first
  const osrmResult = await getWalkingRoute(from, to);

  if (osrmResult) {
    return { ...osrmResult, source: "osrm" };
  }

  // Fallback to haversine
  log.info("[osrm] Using haversine fallback");
  const distanceKm = haversineDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );

  const durationMin = estimateWalkingTime(distanceKm);

  return { distanceKm, durationMin, source: "haversine" };
}
