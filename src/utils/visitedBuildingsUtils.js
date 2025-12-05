import { log } from '@/lib/log';
import { supabaseGateway } from '@/services/gateways/supabaseGateway';

/**
 * Fetch all buildings that a user has previously scanned
 * @param {string} userId - The user's ID
 * @returns {Promise<Set<string>>} Set of building IDs (BINs or BBLs) that the user has scanned
 */
export async function fetchUserScannedBuildings(userId) {
  if (!userId) {
    return new Set();
  }

  try {
    // Step 1: Fetch user's walk IDs first (Supabase JS client doesn't support nested queries in .in())
    const { data: userWalks, error: walksError } = await supabaseGateway
      .from('walks')
      .select('id')
      .eq('user_id', userId);

    if (walksError) {
      log.warn('[fetchUserScannedBuildings] Error fetching user walks', walksError);
    }

    const walkIds = userWalks?.map(w => w.id) || [];
    let walkPoints = null;
    let walkError = null;

    // Step 2: Fetch from walk_seen_points table (buildings scanned during walks)
    if (walkIds.length > 0) {
      const result = await supabaseGateway
        .from('walk_seen_points')
        .select('building_bin, building_bbl')
        .eq('scanned', true)
        .in('walk_id', walkIds);
      
      walkPoints = result.data;
      walkError = result.error;
    }

    if (walkError) {
      log.warn('[fetchUserScannedBuildings] Error fetching from walk_seen_points', walkError);
    }

    // Also fetch from aesthetic_events for building_scan events
    const { data: scanEvents, error: scanError } = await supabaseGateway
      .from('aesthetic_events')
      .select('building_bbl')
      .eq('user_id', userId)
      .eq('event_type', 'building_scan')
      .not('building_bbl', 'is', null);

    if (scanError) {
      log.warn('[fetchUserScannedBuildings] Error fetching from aesthetic_events', scanError);
    }

    // Combine both sources
    const scannedIds = new Set();

    if (walkPoints) {
      walkPoints.forEach(point => {
        if (point.building_bin) scannedIds.add(point.building_bin);
        if (point.building_bbl) scannedIds.add(point.building_bbl);
      });
    }

    if (scanEvents) {
      scanEvents.forEach(event => {
        if (event.building_bbl) scannedIds.add(event.building_bbl);
      });
    }

    log.info(`[fetchUserScannedBuildings] Found ${scannedIds.size} previously scanned buildings for user`);
    return scannedIds;

  } catch (error) {
    log.error('[fetchUserScannedBuildings] Unexpected error', error);
    return new Set();
  }
}

/**
 * Filter buildings to exclude those the user has already scanned
 * @param {Array} buildings - Array of building objects
 * @param {Set<string>} scannedIds - Set of scanned building IDs
 * @returns {Array} Filtered buildings array
 */
export function filterVisitedBuildings(buildings, scannedIds) {
  if (!scannedIds || scannedIds.size === 0) {
    return buildings;
  }

  return buildings.filter(building => {
    const bin = building.bin || building.building_bin;
    const bbl = building.bbl || building.building_bbl;
    
    // Keep building if neither BIN nor BBL has been scanned
    return !scannedIds.has(bin) && !scannedIds.has(bbl);
  });
}
