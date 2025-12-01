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
import { getMultiPointRoute, haversineDistance } from "./osrmService";

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
  route?: {
    distanceKm: number;
    durationMin: number;
    legs: { distanceKm: number; durationMin: number; steps?: any[] }[];
  } | null; // OSRM route data with turn-by-turn steps
};

/**
 * Greedy time-constrained selection algorithm
 * Phase 1: Use haversine for fast initial selection
 * Phase 2: Verify route with OSRM and adjust if needed
 */
async function greedyTimeSelection(
  sortedBuildings: Building[],
  userStart: { latitude: number; longitude: number },
  minTimeMin: number,
  maxTimeMin: number,
): Promise<Building[]> {
  const WALKING_SPEED_KMH = 4.5;

  log.info('[routeBuilder] Starting greedy selection', {
    totalBuildings: sortedBuildings.length,
    minTime: minTimeMin.toFixed(1),
    maxTime: maxTimeMin.toFixed(1),
  });

  // PHASE 1: Fast haversine-based selection
  const selected: Building[] = [];
  let currentTime = 0;
  let currentLocation = userStart;
  let skippedCount = 0;

  for (const building of sortedBuildings) {
    // Quick haversine estimate
    const distanceKm = haversineDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      building.latitude!,
      building.longitude!
    );

    // Estimate walking time (haversine * 1.4 for city routing overhead)
    const estimatedWalkTimeMin = (distanceKm * 1.4 / WALKING_SPEED_KMH) * 60;

    // Quick check: skip if would exceed time
    if (currentTime + estimatedWalkTimeMin > maxTimeMin * 1.2) {
      skippedCount++;
      continue;
    }

    selected.push(building);
    currentTime += estimatedWalkTimeMin;
    currentLocation = {
      latitude: building.latitude!,
      longitude: building.longitude!,
    };

    // Early termination once time budget filled
    if (currentTime >= minTimeMin && selected.length >= MIN_BUILDINGS_FOR_ROUTE) {
      break;
    }
  }

  log.info('[routeBuilder] Phase 1 complete (haversine)', {
    selected: selected.length,
    estimatedTime: currentTime.toFixed(1),
  });

  // PHASE 2: Get actual route from OSRM for accurate directions
  if (selected.length > 0) {
    log.info('[routeBuilder] Phase 2: Fetching actual route from OSRM...');

    // Build waypoint list: start -> building1 -> building2 -> ... -> buildingN
    const waypoints = [
      userStart,
      ...selected.map(b => ({ latitude: b.latitude!, longitude: b.longitude! }))
    ];

    // Get multi-point route from OSRM
    const routeData = await getMultiPointRoute(waypoints);

    if (routeData) {
      const actualDuration = routeData.durationMin;
      log.info('[routeBuilder] OSRM actual route', {
        estimatedTime: currentTime.toFixed(1),
        actualTime: actualDuration.toFixed(1),
        difference: (actualDuration - currentTime).toFixed(1),
      });

      // If actual route exceeds maxTime, trim buildings from the end
      if (actualDuration > maxTimeMin * 1.1) {
        log.info('[routeBuilder] Actual route too long, trimming buildings...');

        // Binary search to find how many buildings fit
        let trimmedCount = selected.length;
        while (trimmedCount > MIN_BUILDINGS_FOR_ROUTE && actualDuration > maxTimeMin) {
          trimmedCount = Math.floor(trimmedCount * 0.8); // Remove 20% at a time
          const trimmedWaypoints = [userStart, ...selected.slice(0, trimmedCount).map(b =>
            ({ latitude: b.latitude!, longitude: b.longitude! }))];

          const trimmedRoute = await getMultiPointRoute(trimmedWaypoints);
          if (trimmedRoute && trimmedRoute.durationMin <= maxTimeMin) {
            log.info('[routeBuilder] Trimmed to fit', {
              buildings: trimmedCount,
              duration: trimmedRoute.durationMin.toFixed(1),
            });
            return selected.slice(0, trimmedCount);
          }
        }
      }
    } else {
      log.warn('[routeBuilder] OSRM route failed, using haversine estimates');
    }
  }

  log.info('[routeBuilder] Route calculations complete', {
    selected: selected.length,
    skipped: skippedCount,
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

  // Step 4: Get final accurate route from OSRM with directions
  let routeGeometry = null;
  let actualDuration = 0;
  let actualDistance = 0;

  if (selectedBuildings.length > 0) {
    const waypoints = [
      userLocation,
      ...selectedBuildings.map(b => ({ latitude: b.latitude!, longitude: b.longitude! }))
    ];

    const osrmRoute = await getMultiPointRoute(waypoints);

    if (osrmRoute) {
      actualDuration = osrmRoute.durationMin;
      actualDistance = osrmRoute.distanceKm;
      routeGeometry = osrmRoute; // Contains legs, geometry, etc. for turn-by-turn

      log.info("[routeBuilder] Final OSRM route fetched", {
        buildings: selectedBuildings.length,
        duration: `${actualDuration.toFixed(1)}min`,
        distance: `${actualDistance.toFixed(2)}km`,
      });
    } else {
      // Fallback to haversine estimates
      actualDistance = calculateTotalDistance(selectedBuildings, userLocation);
      actualDuration = (actualDistance / WALKING_SPEED_KMH) * 60;
      log.warn("[routeBuilder] OSRM failed, using haversine estimates");
    }
  }

  log.info("[routeBuilder] Route complete", {
    tier: routeTier,
    buildingCount: selectedBuildings.length,
    estimatedDuration: `${actualDuration.toFixed(1)}min`,
    compatibility: compatibilityScore.toFixed(1),
    xpMultiplier,
  });

  return {
    buildings: selectedBuildings,
    estimatedDurationMin: actualDuration,
    totalDistanceKm: actualDistance,
    routeTier,
    xpMultiplier,
    compatibilityScore,
    route: routeGeometry, // Full OSRM route data for turn-by-turn navigation
  };
}
