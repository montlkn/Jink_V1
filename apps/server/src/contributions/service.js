/**
 * Service for handling building contributions
 */

import { supabase } from '../supabaseClient.js';
import { findBuildingInCone } from '../utils/geoUtils.js';

export async function uploadContributionService({
  authId,
  latitude,
  longitude,
  heading,
  fov = 60,
  pitch,
  imagePath, // Path in R2 bucket provided by client or previous upload step
  userNotes,
}) {
  console.log('[ContributionService] Processing contribution', { authId, lat: latitude, lng: longitude, heading });

  // 1. Fetch nearby buildings within 150m radius
  const radiusKm = 0.15;
  
  // Use RPC if available, or fallback to bounding box query
  // We'll reimplement the direct query logic here for Node.js
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos((latitude * Math.PI) / 180));

  const { data: nearbyBuildings, error: fetchError } = await supabase
    .from('buildings_full_merge_scanning')
    .select('bin, building_name, address, geocoded_lat, geocoded_lng')
    .gte('geocoded_lat', latitude - latDelta)
    .lte('geocoded_lat', latitude + latDelta)
    .gte('geocoded_lng', longitude - lngDelta)
    .lte('geocoded_lng', longitude + lngDelta)
    .limit(100);

  if (fetchError) {
    console.error('[ContributionService] Error fetching nearby buildings:', fetchError);
    throw new Error('Failed to fetch nearby buildings');
  }

  // Map to format needed for geoUtils
  const candidates = (nearbyBuildings || []).map(b => ({
    ...b,
    lat: b.geocoded_lat,
    lng: b.geocoded_lng
  }));

  // 2. Resolve specific building using Cone of Vision
  const searchLoc = { lat: latitude, lng: longitude };
  const bestMatch = findBuildingInCone(candidates, searchLoc, heading, fov);
  
  // Log the resolution result
  if (bestMatch) {
    console.log(`[ContributionService] Resolved to BIN: ${bestMatch.building.bin} (Score: ${bestMatch.score.toFixed(2)})`);
  } else {
    console.log('[ContributionService] No building resolved in cone');
  }

  const resolvedBin = bestMatch ? bestMatch.building.bin : null;
  const resolvedName = bestMatch ? bestMatch.building.building_name : null;

  // 3. Insert into user_contributed_buildings
  const { data: insertData, error: insertError } = await supabase
    .from('user_contributed_buildings')
    .insert({
      user_id: authId,
      bin: resolvedBin,           // Null if not resolved (will need manual review)
      building_name: resolvedName,
      gps_lat: latitude,
      gps_lng: longitude,
      heading_at_capture: heading,
      pitch_at_capture: pitch,
      initial_photo_url: imagePath,
      user_notes: userNotes,
      status: resolvedBin ? 'pending' : 'pending_review', // Different status if BIN resolved?
      capture_timestamp: new Date().toISOString(),
      submitted_by: 'mobile_app', // Source identifier
    })
    .select()
    .single();

  if (insertError) {
    console.error('[ContributionService] Error inserting contribution:', insertError);
    throw new Error('Failed to save contribution');
  }

  return {
    success: true,
    contributionId: insertData.id,
    resolvedBin: resolvedBin,
    resolvedBuilding: resolvedName,
    matchScore: bestMatch ? bestMatch.score : 0,
    status: insertData.status
  };
}
