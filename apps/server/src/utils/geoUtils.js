/**
 * Geospatial utilities for building resolution
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * 1000; // in meters
}

/**
 * Calculate bearing from start point to end point
 * Returns degrees (0-360) where 0 is North
 */
export function calculateBearing(startLat, startLng, destLat, destLng) {
  const startLatRad = startLat * (Math.PI / 180);
  const startLngRad = startLng * (Math.PI / 180);
  const destLatRad = destLat * (Math.PI / 180);
  const destLngRad = destLng * (Math.PI / 180);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI; // rads to degs
  return (brng + 360) % 360; // normalize to 0-360
}

/**
 * Check if a bearing is within a cone defined by center heading and width
 */
export function isAngleInCone(targetBearing, centerHeading, coneWidth) {
  let diff = targetBearing - centerHeading;
  // Normalize diff to -180 to +180
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff) <= (coneWidth / 2);
}

/**
 * Find the best matching building within a cone of vision
 *
 * @param {Array} buildings - List of building objects { lat, lng, ... }
 * @param {Object} userLoc - { lat, lng }
 * @param {number} heading - User's compass heading (0-360)
 * @param {number} fov - Cone field of view in degrees (default 60)
 * @param {number} maxDist - Max distance in meters (default 100)
 */
export function findBuildingInCone(buildings, userLoc, heading, fov = 60, maxDist = 100) {
  const candidates = [];

  for (const b of buildings) {
    if (!b.lat || !b.lng) continue;

    const dist = haversineDistance(userLoc.lat, userLoc.lng, b.lat, b.lng);
    if (dist > maxDist) continue;

    const bearing = calculateBearing(userLoc.lat, userLoc.lng, b.lat, b.lng);

    if (isAngleInCone(bearing, heading, fov)) {
      // Calculate angular offset from center of vision
      let angleDiff = Math.abs(bearing - heading);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;

      // Score:
      // Distance weight: closer is better (0-1)
      const distScore = 1 - (dist / maxDist);

      // Angle weight: centered is better (0-1)
      const angleScore = 1 - (angleDiff / (fov / 2));

      // Combined score (prioritize angle alignment slightly more for "pointing")
      // But distance is critical too. Let's use 50/50 for now or slight distance bias.
      // Actually closer buildings block farther ones, so distance is key.
      const score = (distScore * 0.6) + (angleScore * 0.4);

      candidates.push({
        building: b,
        score,
        metrics: { distance: dist, angleDiff, bearing }
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  return candidates[0]; // Return best match including score/metrics
}
