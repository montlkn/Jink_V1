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
 * Now includes GPS proximity filtering to avoid matching wrong buildings on same street
 */
export async function fetchBuildingBySearch(params: {
    bin?: string;
    address?: string;
    name?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
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

        // Priority 2: Address + GPS proximity (prevents matching wrong building on same street)
        if (!data && params.address) {
            // Extract street number and street name for fuzzy match
            // E.g., "405 Lexington Ave" -> "405 Lexington%"
            const addressMatch = params.address.match(/^(\d+)\s+(.+)/);
            if (addressMatch) {
                const [, number, streetPart] = addressMatch;
                // Use first two words of street for better matching
                const streetWords = streetPart.split(/\s+/).slice(0, 2).join(
                    " ",
                );

                let query = buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .ilike("address", `${number} ${streetWords}%`);

                // If GPS coords provided, filter by proximity first
                if (params.lat && params.lng) {
                    const radiusKm = params.radiusKm || 0.05; // 50m default
                    const latDelta = radiusKm / 111.0;
                    const lngDelta = radiusKm /
                        (111.0 * Math.cos((params.lat * Math.PI) / 180));

                    query = query
                        .gte("geocoded_lat", params.lat - latDelta)
                        .lte("geocoded_lat", params.lat + latDelta)
                        .gte("geocoded_lng", params.lng - lngDelta)
                        .lte("geocoded_lng", params.lng + lngDelta);
                }

                const result = await query.limit(1).maybeSingle();
                data = result.data;
                error = result.error;

                // If no GPS-filtered match but we have GPS, try wider radius
                if (!data && params.lat && params.lng && !error) {
                    const widerRadius = 0.1; // 100m
                    const latDelta = widerRadius / 111.0;
                    const lngDelta = widerRadius /
                        (111.0 * Math.cos((params.lat * Math.PI) / 180));

                    const widerResult = await buildingsSupabaseClient
                        .from("buildings_full_merge_scanning")
                        .select("*")
                        .ilike("address", `${number} ${streetWords}%`)
                        .gte("geocoded_lat", params.lat - latDelta)
                        .lte("geocoded_lat", params.lat + latDelta)
                        .gte("geocoded_lng", params.lng - lngDelta)
                        .lte("geocoded_lng", params.lng + lngDelta)
                        .limit(1)
                        .maybeSingle();
                    data = widerResult.data;
                    error = widerResult.error;
                }
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
            address: mapped.address,
            lat: mapped.latitude,
            lng: mapped.longitude,
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
 * Search user_contributed_buildings table
 * This allows user contributions to be queried before they're merged into main table
 *
 * Actual schema columns:
 * - bin, bbl, building_name, address, architect, architectural_style, year_built
 * - gps_lat, gps_lng, gps_accuracy
 * - status (pending/approved/rejected), submitted_by
 */
export async function fetchContributedBuildingBySearch(params: {
    bin?: string;
    address?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
}): Promise<BuildingData | null> {
    try {
        if (!buildingsSupabaseClient) {
            return null;
        }

        let data = null;
        let error = null;

        // Priority 1: BIN lookup
        if (params.bin) {
            const result = await buildingsSupabaseClient
                .from("user_contributed_buildings")
                .select("*")
                .eq("bin", params.bin)
                .eq("status", "approved") // Only approved contributions
                .limit(1)
                .maybeSingle();
            data = result.data;
            error = result.error;
        }

        // Priority 2: Address lookup
        if (!data && params.address) {
            const addressMatch = params.address.match(/^(\d+)\s+(\w+)/);
            if (addressMatch) {
                const [, number, street] = addressMatch;
                const result = await buildingsSupabaseClient
                    .from("user_contributed_buildings")
                    .select("*")
                    .ilike("address", `${number} ${street}%`)
                    .eq("status", "approved")
                    .limit(1)
                    .maybeSingle();
                data = result.data;
                error = result.error;
            }
        }

        // Priority 3: GPS proximity using gps_lat/gps_lng columns
        if (!data && params.lat && params.lng) {
            const radiusKm = params.radiusKm || 0.02; // 20m default
            const latDelta = radiusKm / 111.0;
            const lngDelta = radiusKm /
                (111.0 * Math.cos((params.lat * Math.PI) / 180));

            const result = await buildingsSupabaseClient
                .from("user_contributed_buildings")
                .select("*")
                .gte("gps_lat", params.lat - latDelta)
                .lte("gps_lat", params.lat + latDelta)
                .gte("gps_lng", params.lng - lngDelta)
                .lte("gps_lng", params.lng + lngDelta)
                .in("status", ["approved", "pending"]) // Include pending for GPS
                .limit(1)
                .maybeSingle();

            data = result.data;
            error = result.error;
        }

        if (error && error.code !== "PGRST116") {
            console.log(
                "[buildingService] user_contributed_buildings query error:",
                error.message,
            );
            return null;
        }

        if (!data) {
            return null;
        }

        // Map to BuildingData format using actual column names
        const mapped: BuildingData = {
            bin: data.bin,
            name: data.building_name,
            address: data.address,
            architect: data.architect,
            style: data.architectural_style,
            year: data.year_built?.toString(),
            materials: undefined, // Not in user_contributed schema
            use: data.building_use,
            type: undefined, // Not in user_contributed schema
            description: data.notable_features,
            summary: data.user_notes,
            latitude: data.gps_lat,
            longitude: data.gps_lng,
            bbl: data.bbl,
            // Additional user contribution fields
            source: "user_contribution",
            contributed_by: data.submitted_by,
            photo_url: data.initial_photo_url,
            contribution_status: data.status,
            enrichment_data: data.enrichment_data,
        };

        console.log("[buildingService] Found user-contributed building:", {
            name: mapped.name,
            address: mapped.address,
            status: data.status,
            source: "user_contribution",
        });

        return mapped;
    } catch (err) {
        console.log(
            "[buildingService] user_contributed_buildings not available:",
            err,
        );
        return null;
    }
}

/**
 * Fetch nearby buildings using RPC function (much faster than direct query)
 * Returns buildings within radius (km), sorted by distance
 */
export async function fetchNearbyBuildingsFromDB(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
}): Promise<BuildingData[]> {
    const { latitude, longitude, radiusKm = 1.0, limit = 150 } = params;

    try {
        if (!buildingsSupabaseClient) {
            console.warn("[buildingService] Buildings DB not configured");
            return [];
        }

        // Try to use RPC function first (requires database function to be created)
        // This is much faster than filtering in JS
        try {
            const { data: rpcData, error: rpcError } =
                await buildingsSupabaseClient
                    .rpc("nearby_buildings", {
                        lat: latitude,
                        lng: longitude,
                        radius_km: radiusKm,
                        max_results: limit,
                    });

            if (!rpcError && rpcData && rpcData.length > 0) {
                console.log("[buildingService] Fetched via RPC function", {
                    count: rpcData.length,
                    radius: `${radiusKm}km`,
                });

                return rpcData.map((row: any) => ({
                    bin: row.bin,
                    name: row.building_name,
                    address: row.address,
                    architect: row.architect,
                    style: row.style,
                    year: row.year_built?.toString(),
                    lat: row.geocoded_lat,
                    lng: row.geocoded_lng,
                    latitude: row.geocoded_lat,
                    longitude: row.geocoded_lng,
                }));
            }
        } catch {
            console.log(
                "[buildingService] RPC function not available, using direct query",
            );
        }

        // Fallback: Use direct query with very tight bounds to avoid timeout
        // Reduce radius by 50% for faster query
        const reducedRadius = Math.min(radiusKm * 0.5, 1.0); // Max 1km for direct query
        const latDelta = reducedRadius / 111.0;
        const lngDelta = reducedRadius /
            (111.0 * Math.cos((latitude * Math.PI) / 180));

        const minLat = latitude - latDelta;
        const maxLat = latitude + latDelta;
        const minLng = longitude - lngDelta;
        const maxLng = longitude + lngDelta;

        console.log(
            "[buildingService] Using direct query with reduced radius",
            {
                requestedRadius: `${radiusKm}km`,
                queryRadius: `${reducedRadius}km`,
            },
        );

        // Query with timeout protection - use smaller limit
        const { data, error } = await buildingsSupabaseClient
            .from("buildings_full_merge_scanning")
            .select(
                "bin, building_name, address, architect, style, year_built, geocoded_lat, geocoded_lng",
            )
            .gte("geocoded_lat", minLat)
            .lte("geocoded_lat", maxLat)
            .gte("geocoded_lng", minLng)
            .lte("geocoded_lng", maxLng)
            .not("geocoded_lat", "is", null)
            .not("geocoded_lng", "is", null)
            .limit(Math.min(limit, 50)); // Stricter limit for direct query

        if (error) {
            console.error(
                "[buildingService] Error fetching nearby buildings:",
                error,
            );
            return [];
        }

        if (!data || data.length === 0) {
            console.warn("[buildingService] No buildings found in bounds");
            return [];
        }

        const buildings: BuildingData[] = data.map((row: any) => ({
            bin: row.bin,
            name: row.building_name,
            address: row.address,
            architect: row.architect,
            style: row.style,
            year: row.year_built?.toString(),
            lat: row.geocoded_lat,
            lng: row.geocoded_lng,
            latitude: row.geocoded_lat,
            longitude: row.geocoded_lng,
        }));

        const validBuildings = buildings.filter((b) => {
            const hasValid = b.lat && b.lng &&
                b.lat !== 0 && b.lng !== 0 &&
                Math.abs(b.lat) <= 90 && Math.abs(b.lng) <= 180;
            return hasValid;
        });

        console.log("[buildingService] Fetched nearby buildings", {
            total: data.length,
            valid: validBuildings.length,
            radius: `${reducedRadius}km`,
        });

        return validBuildings;
    } catch (err) {
        console.error(
            "[buildingService] Error in fetchNearbyBuildingsFromDB:",
            err,
        );
        return [];
    }
}
