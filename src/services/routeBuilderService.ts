/**
 * Route Builder Service
 * Generates time-constrained walking routes based on aesthetic alignment
 * Uses greedy selection algorithm to fit buildings within user's time budget
 */

import { log } from "@/lib/log";
import {
  type AestheticProfile,
  type Building,
  scoreBuildings,
  type UserStyleExposure,
} from "./recommendationService";
import { getWalkingRouteWithFallback, haversineDistance } from "./osrmService";

// Constants
const WALKING_SPEED_KMH = 4.5; // Average walking speed (fallback)
const TIME_BUFFER_MIN = 0.50; // Use at least 50% of selected time (relaxed from 70%)
const TIME_BUFFER_MAX = 1.20; // Use at most 120% of selected time (relaxed from 85%)
const AESTHETIC_THRESHOLD = 40; // Minimum alignment score (out of 100) for aesthetic mode
const WILDCARD_THRESHOLD = 20; // If avg score < 20, full wildcard mode
const MIN_BUILDINGS_FOR_ROUTE = 2; // Minimum buildings to create a valid route (reduced from 3)
const WILDCARD_XP_MULTIPLIER = 2.5; // XP bonus for exploration walks

export type RouteBuilderParams = {
  buildings: Building[];
  userLocation: { latitude: number; longitude: number };
  userProfile: AestheticProfile | null;
  targetDurationMin: number;
  userExposure?: UserStyleExposure;
};

interface ScoredBuilding extends Building {
  score?: number;
  alignmentScore?: number;
  recommendationScore?: number;
  recommendationTier?: string;
  distanceKm?: number;
  combinedScore?: number;
}

export type RouteResult = {
  buildings: Building[];
  estimatedDurationMin: number;
  totalDistanceKm: number;
  routeTier: "aesthetic" | "behavioral" | "wildcard";
  xpMultiplier: number;
  compatibilityScore: number; // Average aesthetic alignment
  route?: any[]; // TSP route from deriveBuildingOrder
};

/**
 * Greedy time-constrained selection algorithm
 * Adds buildings to route until time budget is exhausted
 * Uses OSRM for accurate walking time estimates with haversine fallback
 */
async function greedyTimeSelection(
  sortedBuildings: Building[],
  userStart: { latitude: number; longitude: number },
  minTimeMin: number,
  maxTimeMin: number,
): Promise<Building[]> {
  const selected: Building[] = [];
  let currentTime = 0;
  let currentLocation = userStart;
  let osrmUsed = 0;
  let haversineUsed = 0;
  let skippedCount = 0;

  log.info('[routeBuilder] Starting greedy selection', {
    totalBuildings: sortedBuildings.length,
    minTime: minTimeMin.toFixed(1),
    maxTime: maxTimeMin.toFixed(1),
  });

  for (const building of sortedBuildings) {
    // Try OSRM first, fall back to haversine
    const route = await getWalkingRouteWithFallback(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      { latitude: building.latitude!, longitude: building.longitude! }
    );

    if (route.source === 'osrm') {
      osrmUsed++;
    } else {
      haversineUsed++;
    }

    const walkTimeMin = route.durationMin;

    // Check if adding this building would exceed max time
    if (currentTime + walkTimeMin > maxTimeMin) {
      skippedCount++;
      // Try to continue - maybe next building is closer
      continue;
    }

    // Add building to route
    selected.push(building);
    currentTime += walkTimeMin;
    currentLocation = {
      latitude: building.latitude!,
      longitude: building.longitude!,
    };

    // Log progress every 5 buildings
    if (selected.length % 5 === 0) {
      log.info(`[routeBuilder] Selected ${selected.length} buildings, ${currentTime.toFixed(1)}/${maxTimeMin.toFixed(1)} min`);
    }
  }

  log.info('[routeBuilder] Route calculations complete', {
    selected: selected.length,
    skipped: skippedCount,
    osrmUsed,
    haversineUsed,
    totalTime: currentTime.toFixed(1),
  });

  return selected;
}

/**
 * Calculate total distance of a route
 */
function calculateTotalDistance(
  buildings: Building[],
  userStart: { latitude: number; longitude: number },
): number {
  if (buildings.length === 0) return 0;

  let totalDistance = 0;
  let currentLocation = userStart;

  for (const building of buildings) {
    const distance = haversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      building.latitude || 0,
      building.longitude || 0,
    );
    totalDistance += distance;
    currentLocation = {
      latitude: building.latitude || 0,
      longitude: building.longitude || 0,
    };
  }

  return totalDistance;
}

/**
 * Main entry point: Build time-constrained route
 * Filters buildings by aesthetic alignment AND time reachability
 * Falls back to behavioral/wildcard modes when needed
 */
export async function buildTimeConstrainedRoute(
  params: RouteBuilderParams,
): Promise<RouteResult> {
  const {
    buildings,
    userLocation,
    userProfile,
    targetDurationMin,
    userExposure,
  } = params;

  log.info("[routeBuilder] Building route", {
    buildingCount: buildings.length,
    targetDuration: targetDurationMin,
    hasProfile: !!userProfile,
  });

  // Step 1: Score buildings aesthetically (if profile exists)
  let scoredBuildings: ScoredBuilding[] = buildings;
  let routeTier: "aesthetic" | "behavioral" | "wildcard" = "aesthetic";
  let xpMultiplier = 1.0;
  let compatibilityScore = 50;

  if (userProfile?.normalized_scores) {
    scoredBuildings = scoreBuildings(buildings, userProfile, userExposure).map(
      (scored) => {
        const original = buildings.find((b) => b.bin === scored.bin);
        return {
          ...original!,
          recommendationScore: scored.score,
          alignmentScore: scored.alignmentScore,
          recommendationTier: "",
        } as ScoredBuilding;
      },
    );

    // Calculate average compatibility
    const totalAlignment = scoredBuildings.reduce(
      (sum, b) => sum + (b.alignmentScore || 0),
      0,
    );
    compatibilityScore = scoredBuildings.length > 0
      ? totalAlignment / scoredBuildings.length
      : 50;

    // Tier detection
    if (compatibilityScore < WILDCARD_THRESHOLD) {
      // WILDCARD MODE: Very low compatibility
      routeTier = "wildcard";
      xpMultiplier = WILDCARD_XP_MULTIPLIER;
      log.info("[routeBuilder] Wildcard mode activated", {
        avgScore: compatibilityScore,
      });
    } else {
      // Filter by aesthetic threshold
      const aestheticMatches = scoredBuildings.filter(
        (b) => (b.alignmentScore || 0) >= AESTHETIC_THRESHOLD,
      );

      if (aestheticMatches.length < MIN_BUILDINGS_FOR_ROUTE) {
        // BEHAVIORAL FALLBACK: Not enough aesthetic matches
        routeTier = "behavioral";
        xpMultiplier = 1.0;
        log.info("[routeBuilder] Behavioral fallback triggered", {
          aestheticMatches: aestheticMatches.length,
        });

        // Use behavioral scoring (requires past interactions)
        // For now, fall back to all buildings sorted by significance
        scoredBuildings = buildings
          .map((b) => ({
            ...b,
            score: b.significance_score || 50,
          } as ScoredBuilding))
          .sort((a, b) => (b.score || 0) - (a.score || 0));
      } else {
        // AESTHETIC MODE: Sufficient matches
        scoredBuildings = aestheticMatches;
      }
    }
  } else {
    // No profile: sort by significance
    scoredBuildings = buildings
      .map((
        b,
      ) => ({ ...b, score: b.significance_score || 50 } as ScoredBuilding))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Filter out buildings without valid coordinates
  const validBuildings = scoredBuildings.filter((b) => {
    const hasValidCoords = b.latitude && b.longitude &&
      b.latitude !== 0 && b.longitude !== 0 &&
      Math.abs(b.latitude) <= 90 && Math.abs(b.longitude) <= 180;

    if (!hasValidCoords) {
      log.warn("[routeBuilder] Filtering out building with invalid coordinates", {
        bin: b.bin,
        name: b.name,
        lat: b.latitude,
        lng: b.longitude,
      });
    }

    return hasValidCoords;
  });

  if (validBuildings.length === 0) {
    log.error("[routeBuilder] No buildings with valid coordinates");
    return {
      buildings: [],
      estimatedDurationMin: 0,
      totalDistanceKm: 0,
      routeTier,
      xpMultiplier,
      compatibilityScore,
    };
  }

  // Step 2: Sort by combined score (70% aesthetic/behavioral + 30% proximity)
  const withProximity = validBuildings.map((b) => {
    const distanceKm = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      b.latitude!,
      b.longitude!,
    );

    // Proximity score: closer = higher (inverse distance)
    const proximityScore = Math.max(0, 2.0 - distanceKm) * 50;

    const combinedScore = ((b.recommendationScore || b.score || 50) * 0.7) +
      (proximityScore * 0.3);

    return {
      ...b,
      distanceKm,
      combinedScore,
    } as ScoredBuilding;
  });

  // Sort by combined score
  withProximity.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));

  // Step 3: Greedy time-constrained selection
  const targetMinTime = targetDurationMin * TIME_BUFFER_MIN;
  const targetMaxTime = targetDurationMin * TIME_BUFFER_MAX;

  log.info('[routeBuilder] Time constraints', {
    target: targetDurationMin,
    min: targetMinTime.toFixed(1),
    max: targetMaxTime.toFixed(1),
  });

  const selectedBuildings = await greedyTimeSelection(
    withProximity,
    userLocation,
    targetMinTime,
    targetMaxTime,
  );

  if (selectedBuildings.length === 0) {
    log.warn(
      "[routeBuilder] No buildings selected within time budget, using closest buildings",
    );

    // Fallback: select closest 5 buildings as a minimal route
    const fallbackBuildings = withProximity
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
      .slice(0, Math.min(5, withProximity.length));

    if (fallbackBuildings.length > 0) {
      const fallbackDistance = calculateTotalDistance(
        fallbackBuildings,
        userLocation,
      );
      const fallbackDuration = (fallbackDistance / WALKING_SPEED_KMH) * 60;

      log.info("[routeBuilder] Fallback route created", {
        buildingCount: fallbackBuildings.length,
        estimatedDuration: `${fallbackDuration.toFixed(1)}min`,
      });

      return {
        buildings: fallbackBuildings,
        estimatedDurationMin: fallbackDuration,
        totalDistanceKm: fallbackDistance,
        routeTier,
        xpMultiplier,
        compatibilityScore,
      };
    }
  }

  // Step 4: Calculate final route metrics
  const totalDistance = calculateTotalDistance(
    selectedBuildings,
    userLocation,
  );
  const estimatedDuration = (totalDistance / WALKING_SPEED_KMH) * 60;

  log.info("[routeBuilder] Route complete", {
    tier: routeTier,
    buildingCount: selectedBuildings.length,
    estimatedDuration: `${estimatedDuration.toFixed(1)}min`,
    compatibility: compatibilityScore.toFixed(1),
    xpMultiplier,
  });

  return {
    buildings: selectedBuildings,
    estimatedDurationMin: estimatedDuration,
    totalDistanceKm: totalDistance,
    routeTier,
    xpMultiplier,
    compatibilityScore,
  };
}
