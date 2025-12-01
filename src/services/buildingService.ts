import { buildingsSupabaseClient } from "./gateways/buildingsSupabaseClient";

export type BuildingData = {
    bin?: string;
    name?: string;
    address?: string;
    architect?: string;
    style?: string;
    year?: string;
    materials?: string;
    use?: string;
    type?: string;
    description?: string;
    summary?: string;
    latitude?: number;
    longitude?: number;
    [key: string]: any;
};

/**
 * Search for a building in the Supabase buildings_full_merge_scanning table
 */
export async function fetchBuildingBySearch(params: {
    bin?: string;
    address?: string;
    name?: string;
}): Promise<BuildingData | null> {
    try {
        if (!buildingsSupabaseClient) {
            return null;
        }

        let data = null;
        let error = null;

        // Priority 1: BIN (exact, fast)
        if (params.bin) {
            const result = await buildingsSupabaseClient
                .from("buildings_full_merge_scanning")
                .select("*")
                .eq("bin", params.bin)
                .limit(1)
                .maybeSingle();
            data = result.data;
            error = result.error;
        }

        // Priority 2: Address (fuzzy match on street number + street name)
        if (!data && params.address) {
            // Extract street number and first word of street name
            // E.g., "405 Lexington Ave" -> "405 Lexington%"
            const addressMatch = params.address.match(/^(\d+)\s+(\w+)/);
            if (addressMatch) {
                const [, number, street] = addressMatch;
                const result = await buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .ilike("address", `${number} ${street}%`)
                    .limit(1)
                    .maybeSingle();
                data = result.data;
                error = result.error;
            }
        }

        // Priority 3: Name (exact match fallback)
        if (!data && params.name) {
            const result = await buildingsSupabaseClient
                .from("buildings_full_merge_scanning")
                .select("*")
                .eq("name", params.name)
                .limit(1)
                .maybeSingle();
            data = result.data;
            error = result.error;
        }

        if (error && error.code !== "PGRST116") {
            console.error("[buildingService] Error:", error.message);
        }

        if (!data) {
            return null;
        }

        // Map database columns to our expected format
        // Based on actual schema: building_name, year_built, mat_prim, use_original, etc.
        const mapped: BuildingData = {
            bin: data.bin || data.BIN,
            name: data.building_name || data.name || data.build_nme,
            address: data.address || data.des_addres,
            architect: data.architect || data.alt_architect,
            style: data.style || data.style_prim,
            year: data.year_built?.toString() || data.build_year?.toString() ||
                data.year,
            materials: data.mat_prim || data.mat_primary || data.material,
            use: data.use_original || data.building_use,
            type: data.building_type || data.build_type || data.type,
            description: data.description || data.storytelling,
            summary: data.summary,
            latitude: data.geocoded_lat || data.latitude || data.input_lat,
            longitude: data.geocoded_lng || data.longitude || data.input_lng,
        };

        console.log("[buildingService] Found & mapped:", {
            name: mapped.name,
            architect: mapped.architect,
            materials: mapped.materials,
            use: mapped.use,
            type: mapped.type,
            year: mapped.year,
        });

        return mapped;
    } catch (err) {
        console.error("[buildingService] Error:", err);
        return null;
    }
}

export async function fetchBuildingByBin(
    bin: string,
): Promise<BuildingData | null> {
    return fetchBuildingBySearch({ bin });
}

export async function fetchBuildingByAddress(
    address: string,
): Promise<BuildingData | null> {
    return fetchBuildingBySearch({ address });
}

export async function fetchBuildingByName(
    name: string,
): Promise<BuildingData | null> {
    return fetchBuildingBySearch({ name });
}

/**
 * Fetch nearby buildings using PostGIS distance query
 * Returns up to 200 buildings within radius (km)
 */
export async function fetchNearbyBuildingsFromDB(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
}): Promise<BuildingData[]> {
    const { latitude, longitude, radiusKm = 1.0, limit = 200 } = params;

    try {
        if (!buildingsSupabaseClient) {
            console.warn('[buildingService] Buildings DB not configured');
            return [];
        }

        // Use PostGIS earth_distance function for accurate distance calculation
        // Note: This requires PostGIS extension and geography columns
        // For now, use simple bounding box then calculate haversine in JS

        // Calculate approximate lat/lng bounds for the radius
        // 1 degree latitude ≈ 111 km
        // 1 degree longitude ≈ 111 km * cos(latitude)
        const latDelta = radiusKm / 111.0;
        const lngDelta = radiusKm / (111.0 * Math.cos((latitude * Math.PI) / 180));

        const minLat = latitude - latDelta;
        const maxLat = latitude + latDelta;
        const minLng = longitude - lngDelta;
        const maxLng = longitude + lngDelta;

        const { data, error } = await buildingsSupabaseClient
            .from('buildings_full_merge_scanning')
            .select('*')
            .gte('lat', minLat)
            .lte('lat', maxLat)
            .gte('lng', minLng)
            .lte('lng', maxLng)
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .limit(limit);

        if (error) {
            console.error('[buildingService] Error fetching nearby buildings:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.warn('[buildingService] No buildings found in bounds', {
                minLat,
                maxLat,
                minLng,
                maxLng,
            });
            return [];
        }

        // Map to BuildingData format with lat/lng fields
        const buildings: BuildingData[] = data.map((row: any) => ({
            bin: row.bin || row.BIN,
            name: row.building_name || row.name || row.build_nme,
            address: row.address || row.des_addres,
            architect: row.architect || row.alt_architect,
            style: row.style || row.style_prim,
            year: row.year_built?.toString() || row.build_year?.toString() || row.year,
            materials: row.mat_prim || row.mat_primary || row.material,
            use: row.use_original || row.building_use,
            type: row.building_type || row.build_type || row.type,
            description: row.description || row.storytelling,
            summary: row.summary,
            // Important: Use lat/lng field names (not latitude/longitude)
            lat: row.lat || row.geocoded_lat || row.input_lat,
            lng: row.lng || row.geocoded_lng || row.input_lng,
            latitude: row.lat || row.geocoded_lat || row.input_lat,
            longitude: row.lng || row.geocoded_lng || row.input_lng,
            significance_score: row.significance_score,
        }));

        // Filter out buildings with invalid coordinates
        const validBuildings = buildings.filter((b) => {
            const hasValid = b.lat && b.lng &&
                b.lat !== 0 && b.lng !== 0 &&
                Math.abs(b.lat) <= 90 && Math.abs(b.lng) <= 180;
            return hasValid;
        });

        console.log('[buildingService] Fetched nearby buildings', {
            total: data.length,
            valid: validBuildings.length,
            radius: `${radiusKm}km`,
        });

        return validBuildings;
    } catch (err) {
        console.error('[buildingService] Error in fetchNearbyBuildingsFromDB:', err);
        return [];
    }
}
