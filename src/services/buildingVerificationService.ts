/**
 * Building Verification Service
 *
 * Multi-tier verification system:
 * 1. CLIP/Embedding match (backend ML)
 * 2. Cone of vision + GPS proximity (geometric verification)
 * 3. Google Street View embedding (cold start fallback)
 */

import { log } from "@/lib/log";

export type VerificationResult = {
  verified: boolean;
  confidence: number; // 0-100
  method:
    | "clip"
    | "cone_of_vision"
    | "streetview"
    | "manual"
    | "user_contribution";
  candidateBuildings?: any[];
  buildingBin?: string;
  buildingData?: any;
};

/**
 * Calculate haversine distance between two GPS coordinates (in km)
 */
function haversineDistance(
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
 * Calculate bearing from point A to point B (in degrees, 0-360)
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Normalize angle difference to -180 to 180 range
 */
function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

/**
 * Get candidate buildings within cone of vision
 * Uses GPS proximity + compass bearing + pitch to narrow down buildings
 */
export function getCandidateBuildingsInVision(params: {
  userLat: number;
  userLng: number;
  compassBearing: number; // 0-360 degrees
  pitch?: number; // -90 to 90 degrees (negative = looking down, positive = looking up)
  nearbyBuildings: any[]; // Buildings from route or nearby query
  proximityRadiusKm?: number; // Default 0.02 (20m)
  coneAngleDeg?: number; // Default ±30°
}): {
  candidates: any[];
  confidence: number;
  debugInfo: any;
} {
  const {
    userLat,
    userLng,
    compassBearing,
    pitch = 0,
    nearbyBuildings,
    proximityRadiusKm = 0.02, // 20 meters
    coneAngleDeg = 30,
  } = params;

  // Step 1: GPS proximity filter
  const closeBuildings = nearbyBuildings.filter((b) => {
    const lat = b.latitude || b.lat || b.geocoded_lat;
    const lng = b.longitude || b.lng || b.geocoded_lng;

    if (!lat || !lng) return false;

    const distance = haversineDistance(userLat, userLng, lat, lng);
    return distance <= proximityRadiusKm;
  });

  log.info("[verification] GPS proximity filter", {
    total: nearbyBuildings.length,
    closeBuildings: closeBuildings.length,
    radiusKm: proximityRadiusKm,
  });

  // Step 2: Compass cone filter
  const buildingsInCone = closeBuildings.filter((b) => {
    const lat = b.latitude || b.lat || b.geocoded_lat;
    const lng = b.longitude || b.lng || b.geocoded_lng;

    const bearingToBuilding = calculateBearing(userLat, userLng, lat, lng);
    const angleDiff = Math.abs(
      normalizeAngle(bearingToBuilding - compassBearing),
    );

    return angleDiff <= coneAngleDeg;
  });

  log.info("[verification] Cone of vision filter", {
    closeBuildings: closeBuildings.length,
    inCone: buildingsInCone.length,
    compassBearing,
    coneAngle: `±${coneAngleDeg}°`,
  });

  // Step 3: Pitch filter (if building height available)
  // This is optional and may not work well without building heights
  const buildingsInView = buildingsInCone.filter((b) => {
    const buildingHeight = b.height || b.building_height;

    // If no height data, can't filter - include by default
    if (!buildingHeight) return true;

    const lat = b.latitude || b.lat || b.geocoded_lat;
    const lng = b.longitude || b.lng || b.geocoded_lng;
    const distanceM = haversineDistance(userLat, userLng, lat, lng) * 1000;

    // Expected pitch to see middle of building
    const expectedPitch = Math.atan2(buildingHeight / 2, distanceM) *
      (180 / Math.PI);

    // Tolerant pitch matching (±45° tolerance)
    return Math.abs(pitch - expectedPitch) < 45;
  });

  log.info("[verification] Pitch filter", {
    inCone: buildingsInCone.length,
    inView: buildingsInView.length,
    userPitch: pitch,
  });

  // Calculate confidence based on number of candidates
  let confidence = 0;
  if (buildingsInView.length === 1) {
    confidence = 95; // High confidence - only one building matches
  } else if (buildingsInView.length === 2) {
    confidence = 75; // Medium-high confidence
  } else if (buildingsInView.length === 3) {
    confidence = 60; // Medium confidence
  } else if (buildingsInView.length > 3) {
    confidence = 40; // Low confidence - too many candidates
  } else {
    confidence = 0; // No candidates
  }

  return {
    candidates: buildingsInView,
    confidence,
    debugInfo: {
      totalNearby: nearbyBuildings.length,
      afterGPS: closeBuildings.length,
      afterCone: buildingsInCone.length,
      afterPitch: buildingsInView.length,
      userPosition: { lat: userLat, lng: userLng },
      compassBearing,
      pitch,
    },
  };
}

/**
 * Helper: Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout) - but do retry on network errors
      if (error instanceof Error && error.name === "AbortError") {
        log.warn(
          `[verification] CLIP attempt ${attempt + 1} timed out, retrying...`,
        );
      } else {
        log.warn(
          `[verification] CLIP attempt ${attempt + 1} failed: ${error}`,
        );
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Tier 1: Try CLIP/Embedding verification via backend
 * Includes 45s timeout and 3x retry with exponential backoff
 */
export async function verifyWithClip(params: {
  photo: any;
  position: any;
  heading: number;
  expectedBuilding?: any;
}): Promise<VerificationResult | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photo, position, heading, expectedBuilding: _expectedBuilding } =
    params;
  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ||
    "http://localhost:8000";

  const makeRequest = async (): Promise<Response> => {
    const formData = new FormData();
    formData.append("photo", {
      uri: photo.uri,
      type: "image/jpeg",
      name: "scan.jpg",
    } as any);
    formData.append("gps_lat", position.latitude.toString());
    formData.append("gps_lng", position.longitude.toString());
    formData.append("compass_bearing", heading.toString());
    formData.append("phone_pitch", "0");
    formData.append("phone_roll", "0");
    formData.append("altitude", (position.altitude || 0).toString());

    const controller = new AbortController();
    // Increased timeout: 30s → 45s (CLIP cold start can take 25s+)
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    // Retry with exponential backoff: 3 attempts, 1s base delay
    const response = await retryWithBackoff(makeRequest, 3, 1000);

    if (!response.ok) {
      log.warn("[verification] Backend scan failed", response.status);
      return null;
    }

    const data = JSON.parse(await response.text());

    // CLIP returns a BIN - we need to fetch full building data from our DB
    const matchedBin = data.building?.bin || data.building?.bbl || data.bin;

    if (matchedBin) {
      log.info("[verification] CLIP matched BIN, fetching full data from DB", {
        bin: matchedBin,
      });

      // Import dynamically to avoid circular dependency
      const { fetchBuildingBySearch } = await import("./buildingService");

      // Query our database for complete building info
      const buildingData = await fetchBuildingBySearch({ bin: matchedBin });

      if (buildingData && buildingData.name) {
        log.info("[verification] CLIP match - full data fetched from DB", {
          building: buildingData.name,
          bin: matchedBin,
          architect: buildingData.architect,
          year: buildingData.year,
        });

        return {
          verified: true,
          confidence: 90, // High confidence from ML
          method: "clip",
          buildingBin: matchedBin,
          buildingData: buildingData,
        };
      }

      // BIN found by CLIP but not in our DB - use backend data as fallback
      if (data.building && data.building.name) {
        log.info(
          "[verification] CLIP match - using backend data (not in local DB)",
          {
            building: data.building.name,
            bin: matchedBin,
          },
        );

        return {
          verified: true,
          confidence: 90,
          method: "clip",
          buildingBin: matchedBin,
          buildingData: data.building,
        };
      }
    }

    // Legacy fallback: backend returns full building object directly
    if (data.building && data.building.name) {
      log.info("[verification] CLIP match (legacy flow)", {
        building: data.building.name,
        bin: data.building.bin,
      });

      return {
        verified: true,
        confidence: 90, // High confidence from ML
        method: "clip",
        buildingBin: data.building.bin || data.building.bbl,
        buildingData: data.building,
      };
    }

    log.info("[verification] CLIP no match - building not in embeddings");
    return null;
  } catch (error) {
    log.error("[verification] CLIP verification error", error);
    return null;
  }
}

/**
 * Tier 2: Cone of vision + GPS proximity verification
 */
export function verifyWithConeOfVision(params: {
  position: any;
  heading: number;
  pitch?: number;
  expectedBuilding: any;
  nearbyBuildings: any[];
}): VerificationResult {
  const { position, heading, pitch, expectedBuilding, nearbyBuildings } =
    params;

  const { candidates, confidence, debugInfo } = getCandidateBuildingsInVision({
    userLat: position.latitude,
    userLng: position.longitude,
    compassBearing: heading,
    pitch: pitch || 0,
    nearbyBuildings,
    proximityRadiusKm: 0.02, // 20m
    coneAngleDeg: 30, // ±30°
  });

  // Check if expected building is in candidates
  const expectedBin = expectedBuilding?.bin;
  const matchedCandidate = candidates.find(
    (c) => c.bin === expectedBin || c.bbl === expectedBin,
  );

  if (matchedCandidate && confidence >= 60) {
    log.info("[verification] Cone of vision match", {
      building: matchedCandidate.building_name || matchedCandidate.name,
      confidence,
      candidates: candidates.length,
    });

    return {
      verified: true,
      confidence,
      method: "cone_of_vision",
      buildingBin: expectedBin,
      buildingData: matchedCandidate,
      candidateBuildings: candidates,
    };
  }

  log.warn("[verification] Cone of vision failed", {
    expectedBin,
    candidates: candidates.length,
    confidence,
    debugInfo,
  });

  return {
    verified: false,
    confidence,
    method: "cone_of_vision",
    candidateBuildings: candidates,
  };
}

/**
 * Tier 3: User photo cold start (lazy embedding)
 *
 * When a building has no embeddings yet, the user's photo is sent to the backend
 * to create the first embedding. This populates the database organically through usage.
 *
 * Benefits over Street View:
 * - Free (no Google API costs)
 * - Better data (real viewing angles, current photos)
 * - Community-driven (users populate database through walks)
 */
export async function verifyWithUserPhotoContribution(params: {
  photo: any;
  building: any;
  position: any;
  heading: number;
}): Promise<VerificationResult | null> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ||
    "http://localhost:8000";

  try {
    // Step 1: Upload photo to backend via /api/scan first to get R2 URL
    // Then use /api/confirm-with-photo to add to reference embeddings

    const formData = new FormData();
    formData.append("photo", {
      uri: params.photo.uri,
      type: "image/jpeg",
      name: "walk_contribution.jpg",
    } as any);
    formData.append("gps_lat", params.position.latitude.toString());
    formData.append("gps_lng", params.position.longitude.toString());
    formData.append("compass_bearing", params.heading.toString());
    formData.append("phone_pitch", "0");
    formData.append("phone_roll", "0");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    // Upload photo and get scan result (includes user_photo_url)
    const scanResponse = await fetch(`${BACKEND_URL}/api/scan`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!scanResponse.ok) {
      log.warn("[verification] Photo upload failed", scanResponse.status);
      return null;
    }

    const scanData = JSON.parse(await scanResponse.text());

    // Step 2: Confirm this as the correct building to add to reference embeddings
    // This triggers the embedding creation and storage in reference_embeddings table
    const confirmBody = new URLSearchParams();
    confirmBody.append("scan_id", scanData.scan_id);
    confirmBody.append("confirmed_bin", params.building.bin);
    confirmBody.append(
      "photo_url",
      scanData.user_photo_url || params.photo.uri,
    );
    confirmBody.append("compass_bearing", params.heading.toString());
    confirmBody.append("phone_pitch", "0");

    const confirmResponse = await fetch(
      `${BACKEND_URL}/api/confirm-with-photo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: confirmBody.toString(),
      },
    );

    if (!confirmResponse.ok) {
      log.warn("[verification] Confirmation failed", confirmResponse.status);
      // Still return success since upload worked
    } else {
      const confirmData = JSON.parse(await confirmResponse.text());
      log.info(
        "[verification] Photo contribution successful - embedding added",
        {
          building: params.building.name,
          bin: params.building.bin,
          embeddingAdded: confirmData.embedding_added,
        },
      );
    }

    return {
      verified: true,
      confidence: 85,
      method: "user_contribution",
      buildingBin: params.building.bin,
      buildingData: params.building,
    };
  } catch (error) {
    log.error("[verification] User photo contribution error", error);
    return null;
  }
}

/**
 * Main verification orchestrator
 * Tries each tier in sequence until verification succeeds
 */
export async function verifyBuilding(params: {
  photo: any;
  position: any;
  heading: number;
  pitch?: number;
  expectedBuilding: any;
  nearbyBuildings: any[];
}): Promise<VerificationResult> {
  const { photo, position, heading, pitch, expectedBuilding, nearbyBuildings } =
    params;

  log.info("[verification] Starting multi-tier verification", {
    expectedBuilding: expectedBuilding?.name,
    nearbyBuildingsCount: nearbyBuildings.length,
  });

  // Tier 1: CLIP/Embedding match
  const clipResult = await verifyWithClip({
    photo,
    position,
    heading,
    expectedBuilding,
  });
  if (clipResult && clipResult.verified) {
    return clipResult;
  }

  // Tier 2: Cone of vision + GPS proximity
  const coneResult = verifyWithConeOfVision({
    position,
    heading,
    pitch,
    expectedBuilding,
    nearbyBuildings,
  });
  if (coneResult.verified) {
    // If cone verified but CLIP didn't, this means either:
    // A) Building has no reference embeddings yet (Street View not fetched)
    // B) User's photo angle doesn't match existing embeddings
    //
    // Solution: Trigger lazy Street View fetch + add user photo to embeddings
    // This is fire-and-forget - doesn't block user flow
    log.info(
      "[verification] Cone verified but no CLIP match - triggering lazy Street View fetch",
    );

    // Backend will:
    // 1. Fetch Street View images for this building (if not already cached)
    // 2. Generate CLIP embeddings from Street View
    // 3. Store user's photo + embedding for multi-angle coverage
    verifyWithUserPhotoContribution({
      photo,
      building: expectedBuilding,
      position,
      heading,
    }).catch((err) =>
      log.warn("[verification] Lazy Street View trigger failed", err)
    );

    return coneResult;
  }

  // All tiers failed
  log.warn("[verification] All verification tiers failed");
  return {
    verified: false,
    confidence: 0,
    method: "manual",
    candidateBuildings: coneResult.candidateBuildings,
  };
}
