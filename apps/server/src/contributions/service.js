/**
 * Service for handling building contributions
 * Integrates with existing CLIP backend, falls back to geometric matching
 */

import FormData from 'form-data';
import fetch from 'node-fetch';
import { supabase } from '../supabaseClient.js';
import { findBuildingInCone } from '../utils/geoUtils.js';

export async function uploadContributionService({
  authId,
  latitude,
  longitude,
  heading,
  fov = 60,
  pitch,
  imageData, // Base64 or buffer
  userNotes,
}) {
  console.log('[ContributionService] Processing contribution', { authId, lat: latitude, lng: longitude, heading });

  const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8000';

  // Step 1: Try CLIP matching via existing /api/scan endpoint
  try {
    console.log('[ContributionService] Attempting CLIP match via /api/scan');
    
    const formData = new FormData();
    
    // Convert base64 to buffer if needed
    let imageBuffer = imageData;
    if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    
    formData.append('photo', imageBuffer, { filename: 'contribution.jpg', contentType: 'image/jpeg' });
    formData.append('gps_lat', latitude.toString());
    formData.append('gps_lng', longitude.toString());
    formData.append('compass_bearing', heading.toString());
    formData.append('phone_pitch', (pitch || 0).toString());
    formData.append('altitude', '0');

    const clipResponse = await fetch(`${BACKEND_URL}/api/scan`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    if (clipResponse.ok) {
      const clipData = await clipResponse.json();
      const matchedBin = clipData.building?.bin || clipData.bin;

      if (matchedBin) {
        console.log(`[ContributionService] CLIP matched BIN: ${matchedBin}`);
        
        // Insert into user_contributed_buildings with CLIP-resolved BIN
        const { data: insertData, error: insertError } = await supabase
          .from('user_contributed_buildings')
          .insert({
            user_id: authId,
            bin: matchedBin,
            building_name: clipData.building?.name,
            gps_lat: latitude,
            gps_lng: longitude,
            heading_at_capture: heading,
            pitch_at_capture: pitch,
            initial_photo_url: clipData.user_photo_url, // R2 URL from backend
            user_notes: userNotes,
            status: 'approved', // CLIP match = high confidence
            capture_timestamp: new Date().toISOString(),
            submitted_by: 'mobile_app',
            resolution_method: 'clip',
          })
          .select()
          .single();

        if (insertError) {
          console.error('[ContributionService] Insert error:', insertError);
          throw new Error('Failed to save contribution');
        }

        return {
          success: true,
          contributionId: insertData.id,
          resolvedBin: matchedBin,
          resolvedBuilding: clipData.building?.name,
          method: 'clip',
          confidence: 'high',
          status: insertData.status
        };
      }
    }
    
    console.log('[ContributionService] CLIP did not match, falling back to cone-of-vision');
  } catch (clipError) {
    console.warn('[ContributionService] CLIP request failed, falling back:', clipError.message);
  }

  // Step 2: Fall back to Cone-of-Vision geometric matching
  const radiusKm = 0.15;
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
    console.error('[ContributionService] Fetch error:', fetchError);
    throw new Error('Failed to fetch nearby buildings');
  }

  const candidates = (nearbyBuildings || []).map(b => ({
    ...b,
    lat: b.geocoded_lat,
    lng: b.geocoded_lng
  }));

  const bestMatch = findBuildingInCone(candidates, { lat: latitude, lng: longitude }, heading, fov);

  const resolvedBin = bestMatch ? bestMatch.building.bin : null;
  const resolvedName = bestMatch ? bestMatch.building.building_name : null;

  // Insert with cone-of-vision resolution (lower confidence = needs review)
  const { data: insertData, error: insertError } = await supabase
    .from('user_contributed_buildings')
    .insert({
      user_id: authId,
      bin: resolvedBin,
      building_name: resolvedName,
      gps_lat: latitude,
      gps_lng: longitude,
      heading_at_capture: heading,
      pitch_at_capture: pitch,
      initial_photo_url: null, // No R2 URL yet - would need separate upload
      user_notes: userNotes,
      status: resolvedBin ? 'pending' : 'pending_review',
      capture_timestamp: new Date().toISOString(),
      submitted_by: 'mobile_app',
      resolution_method: 'cone_of_vision',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[ContributionService] Insert error:', insertError);
    throw new Error('Failed to save contribution');
  }

  return {
    success: true,
    contributionId: insertData.id,
    resolvedBin: resolvedBin,
    resolvedBuilding: resolvedName,
    method: 'cone_of_vision',
    matchScore: bestMatch ? bestMatch.score : 0,
    confidence: resolvedBin ? 'medium' : 'low',
    status: insertData.status
  };
}
