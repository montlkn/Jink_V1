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
 * Helper: wrap a promise or thenable with a timeout
 * Returns null on timeout instead of hanging
 */
async function withTimeout<T>(
    promiseOrThenable: Promise<T> | PromiseLike<T>,
    timeoutMs: number,
): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(
                `[buildingService] Query timed out after ${timeoutMs}ms`,
            );
            resolve(null);
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([
            Promise.resolve(promiseOrThenable),
            timeoutPromise,
        ]);
        clearTimeout(timeoutId!);
        return result;
    } catch (err) {
        clearTimeout(timeoutId!);
        throw err;
    }
}

/**
 * Search for a building in the Supabase buildings_full_merge_scanning table
 * Now includes GPS proximity filtering to avoid matching wrong buildings on same street
 * Added timeout protection to prevent hanging on slow queries
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

        const QUERY_TIMEOUT = 5000; // 5 second timeout per query
        let data: any = null;
        let error: any = null;

        // Priority 1: BIN (exact, fast - indexed)
        // Handle both string and numeric BIN formats (Supabase stores as float like 1036156.0)
        if (params.bin) {
            // Clean up BIN - remove .0 suffix if present
            const binClean = String(params.bin).replace(/\.0$/, "");
            const binNumeric = parseFloat(binClean);
            const binWithDecimal = binClean + ".0"; // Try with .0 since DB stores as text like "1036156.0"

            console.log("[buildingService] BIN lookup:", {
                original: params.bin,
                clean: binClean,
                numeric: binNumeric,
                withDecimal: binWithDecimal,
            });

            // Try with .0 suffix first (matches DB format like "1036156.0")
            let result = await withTimeout(
                buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .eq("bin", binWithDecimal)
                    .limit(1)
                    .maybeSingle(),
                QUERY_TIMEOUT,
            );

            console.log(
                "[buildingService] BIN with .0 query result:",
                result ? (result.data ? "found" : "not found") : "timeout",
            );
            if (result && result.data) {
                data = result.data;
                error = result.error;
            }

            // If .0 match failed, try without .0
            if (!data) {
                result = await withTimeout(
                    buildingsSupabaseClient
                        .from("buildings_full_merge_scanning")
                        .select("*")
                        .eq("bin", binClean)
                        .limit(1)
                        .maybeSingle(),
                    QUERY_TIMEOUT,
                );
                console.log(
                    "[buildingService] BIN clean query result:",
                    result ? (result.data ? "found" : "not found") : "timeout",
                );
                if (result && result.data) {
                    data = result.data;
                    error = result.error;
                }
            }

            // Also try uppercase BIN column as fallback
            if (!data) {
                result = await withTimeout(
                    buildingsSupabaseClient
                        .from("buildings_full_merge_scanning")
                        .select("*")
                        .eq("BIN", binWithDecimal)
                        .limit(1)
                        .maybeSingle(),
                    QUERY_TIMEOUT,
                );
                console.log(
                    "[buildingService] BIN uppercase query result:",
                    result ? (result.data ? "found" : "not found") : "timeout",
                );
                if (result && result.data) {
                    data = result.data;
                    error = result.error;
                }
            }
        }

        // Priority 2: Address - simplified query to avoid timeout
        // Use GPS bounding box FIRST (faster with index), then filter by address
        if (!data && params.address && params.lat && params.lng) {
            const radiusKm = params.radiusKm || 0.05; // 50m default
            const latDelta = radiusKm / 111.0;
            const lngDelta = radiusKm /
                (111.0 * Math.cos((params.lat * Math.PI) / 180));

            // Query by GPS bounds only (faster), then match address in-memory
            const result = await withTimeout(
                buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .gte("geocoded_lat", params.lat - latDelta)
                    .lte("geocoded_lat", params.lat + latDelta)
                    .gte("geocoded_lng", params.lng - lngDelta)
                    .lte("geocoded_lng", params.lng + lngDelta)
                    .limit(10), // Get a few nearby, filter in-memory
                QUERY_TIMEOUT,
            );

            if (result && result.data && result.data.length > 0) {
                // Extract street number from address for matching
                const addressMatch = params.address.match(/^(\d+)/);
                const streetNumber = addressMatch ? addressMatch[1] : null;

                if (streetNumber) {
                    // Find best match by street number
                    data = result.data.find((b: any) =>
                        b.address?.startsWith(streetNumber)
                    ) || result.data[0];
                } else {
                    data = result.data[0];
                }
            }
            if (result) {
                error = result.error;
            }

            // Try wider radius if no match
            if (!data && !error) {
                const widerRadius = 0.15; // 150m
                const wLatDelta = widerRadius / 111.0;
                const wLngDelta = widerRadius /
                    (111.0 * Math.cos((params.lat * Math.PI) / 180));

                const widerResult = await withTimeout(
                    buildingsSupabaseClient
                        .from("buildings_full_merge_scanning")
                        .select("*")
                        .gte("geocoded_lat", params.lat - wLatDelta)
                        .lte("geocoded_lat", params.lat + wLatDelta)
                        .gte("geocoded_lng", params.lng - wLngDelta)
                        .lte("geocoded_lng", params.lng + wLngDelta)
                        .limit(20),
                    QUERY_TIMEOUT,
                );

                if (
                    widerResult && widerResult.data &&
                    widerResult.data.length > 0
                ) {
                    const addressMatch = params.address.match(/^(\d+)/);
                    const streetNumber = addressMatch ? addressMatch[1] : null;

                    if (streetNumber) {
                        data = widerResult.data.find((b: any) =>
                            b.address?.startsWith(streetNumber)
                        ) || widerResult.data[0];
                    } else {
                        data = widerResult.data[0];
                    }
                }
            }
        }

        // Priority 2b: Address without GPS - use simpler exact match
        if (!data && params.address && (!params.lat || !params.lng)) {
            const addressMatch = params.address.match(/^(\d+)\s+(\w+)/);
            if (addressMatch) {
                const [, number, street] = addressMatch;
                const result = await withTimeout(
                    buildingsSupabaseClient
                        .from("buildings_full_merge_scanning")
                        .select("*")
                        .ilike("address", `${number} ${street}%`)
                        .limit(1)
                        .maybeSingle(),
                    QUERY_TIMEOUT,
                );
                if (result) {
                    data = result.data;
                    error = result.error;
                }
            }
        }

        // Priority 3: Name (exact match fallback) - column is building_name, not name
        if (!data && params.name) {
            console.log("[buildingService] Name lookup:", params.name);
            const result = await withTimeout(
                buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .ilike("building_name", params.name)
                    .limit(1)
                    .maybeSingle(),
                QUERY_TIMEOUT,
            );
            if (result) {
                data = result.data;
                error = result.error;
                if (data) {
                    console.log(
                        "[buildingService] Name lookup found:",
                        data.building_name,
                    );
                }
            }
        }

        // Priority 4: GPS coordinates only (no address/name provided)
        if (
            !data && !params.address && !params.name && params.lat && params.lng
        ) {
            const radiusKm = params.radiusKm || 0.05; // 50m default for GPS-only
            const latDelta = radiusKm / 111.0;
            const lngDelta = radiusKm /
                (111.0 * Math.cos((params.lat * Math.PI) / 180));

            console.log("[buildingService] Trying GPS-only lookup:", {
                lat: params.lat,
                lng: params.lng,
                radiusKm,
            });

            const result = await withTimeout(
                buildingsSupabaseClient
                    .from("buildings_full_merge_scanning")
                    .select("*")
                    .gte("geocoded_lat", params.lat - latDelta)
                    .lte("geocoded_lat", params.lat + latDelta)
                    .gte("geocoded_lng", params.lng - lngDelta)
                    .lte("geocoded_lng", params.lng + lngDelta)
                    .limit(1),
                QUERY_TIMEOUT,
            );

            if (result && result.data && result.data.length > 0) {
                data = result.data[0];
                console.log(
                    "[buildingService] GPS-only lookup found:",
                    data.building_name || data.address,
                );
            }
        }

        if (error && error.code !== "PGRST116") {
            console.error("[buildingService] Error:", error.message);
        }

        if (!data) {
            return null;
        }

        // Map database columns to our expected format
        // Based on actual schema: building_name, year_built, mat_prim, use_original, etc.
        // Include all material columns (some buildings have mat_prim AND mat_primary, mat_secondary, mat_tertiary)
        const materialsArray = [
            data.mat_prim,
            data.mat_primary,
            data.mat_secondary,
            data.mat_tertiary,
        ].filter((m) => m && m !== "unknown" && m !== "Unknown"); // Filter out empty and "unknown"

        const mapped: BuildingData = {
            bin: (data.bin || data.BIN || "").replace(/\.0$/, ""), // Clean .0 from BIN for Cloudflare
            name: data.building_name || data.name || data.build_nme,
            address: data.address || data.des_addres,
            architect: data.architect || data.alt_architect,
            style: data.style || data.style_prim,
            year: data.year_built?.toString() || data.build_year?.toString() ||
                data.year,
            materials: materialsArray.length > 0
                ? materialsArray.join(", ")
                : undefined,
            // For use, try building_type first since use_original is often empty
            use: data.building_type || data.build_type || data.use_original ||
                data.type,
            type: data.building_type || data.build_type || data.type,
            description: data.description || data.storytelling,
            summary: data.summary,
            latitude: data.geocoded_lat || data.latitude || data.input_lat,
            longitude: data.geocoded_lng || data.longitude || data.input_lng,
            // Additional fields from schema
            borough: data.borough_name || data.borough,
            bbl: data.bbl,
            height: data.height,
            numFloors: data.num_floors || data.NumFloors,
            landmark: data.landmark,
            historicDistrict: data.historic_district || data.Hist_Dist,
            era: data.era,
            decade: data.decade,
            styleFamily: data.style_family,
            primaryAesthetic: data.primary_aesthetic,
            secondaryAesthetic: data.secondary_aesthetic,
        };

        console.log("[buildingService] Found & mapped:", {
            name: mapped.name,
            architect: mapped.architect,
            address: mapped.address,
            materials: mapped.materials,
            use: mapped.use,
            type: mapped.type,
            bin: mapped.bin,
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

/**
 * Fetch buildings related by a specific category (architect, style, materials, etc.)
 * Results are sorted by proximity to the given coordinates
 */
export async function fetchRelatedBuildings(params: {
    filterType: "architect" | "style" | "materials" | "type" | "use";
    filterValue: string;
    currentLat?: number;
    currentLng?: number;
    excludeBin?: string; // Exclude the current building
    limit?: number;
}): Promise<BuildingData[]> {
    try {
        if (!buildingsSupabaseClient) {
            console.warn("[buildingService] No Supabase client");
            return [];
        }

        const QUERY_TIMEOUT = 8000; // 8 second timeout
        const limit = params.limit || 20;

        console.log("[buildingService] Fetching related buildings:", {
            filterType: params.filterType,
            filterValue: params.filterValue,
        });

        let query;
        let materialsToMatch: string[] = [];

        // For materials, we need to search across multiple columns and match ANY
        if (params.filterType === "materials") {
            // Parse the materials string (e.g., "Brick, Steel, Glass")
            materialsToMatch = params.filterValue
                .split(",")
                .map((m) => m.trim().toLowerCase())
                .filter((m) => m && m !== "unknown");

            if (materialsToMatch.length === 0) {
                console.warn("[buildingService] No valid materials to match");
                return [];
            }

            console.log(
                "[buildingService] Materials to match:",
                materialsToMatch,
            );

            // Build OR query for materials - match ANY of the materials
            // We'll filter and rank in memory for more control
            const firstMaterial = materialsToMatch[0];
            query = buildingsSupabaseClient
                .from("buildings_full_merge_scanning")
                .select("*")
                .or(`mat_prim.ilike.%${firstMaterial}%,mat_primary.ilike.%${firstMaterial}%,mat_secondary.ilike.%${firstMaterial}%,mat_tertiary.ilike.%${firstMaterial}%`);
        } else {
            // Map filter types to database columns
            const columnMap: Record<string, string> = {
                architect: "architect",
                style: "style",
                type: "building_type",
                use: "building_type", // Same as type since use_original is often empty
            };

            const column = columnMap[params.filterType];
            if (!column) {
                console.warn(
                    "[buildingService] Unknown filter type:",
                    params.filterType,
                );
                return [];
            }

            // Use ilike for case-insensitive matching
            query = buildingsSupabaseClient
                .from("buildings_full_merge_scanning")
                .select("*")
                .ilike(column, params.filterValue);
        }

        // Exclude the current building if BIN is provided
        if (params.excludeBin) {
            const binWithDecimal = params.excludeBin + ".0";
            query = query.neq("bin", binWithDecimal).neq(
                "bin",
                params.excludeBin,
            );
        }

        // Limit results - fetch more for materials to filter/rank
        // IMPORTANT: Order by BIN for consistent results (database doesn't guarantee order otherwise)
        query = query
            .order("bin", { ascending: true })
            .limit(params.filterType === "materials" ? limit * 5 : limit * 2);

        const result = await withTimeout(query, QUERY_TIMEOUT);

        if (!result || !result.data) {
            console.warn(
                "[buildingService] No related buildings found or timeout",
            );
            return [];
        }

        // Map the results
        const materialsFilter = (m: string | null | undefined) =>
            m && m !== "unknown" && m !== "Unknown";

        const buildings: BuildingData[] = result.data.map((data: any) => {
            const materialsArray = [
                data.mat_prim,
                data.mat_primary,
                data.mat_secondary,
                data.mat_tertiary,
            ].filter(materialsFilter);

            return {
                bin: (data.bin || data.BIN || "").replace(/\.0$/, ""),
                name: data.building_name || data.name || data.build_nme,
                address: data.address || data.des_addres,
                architect: data.architect || data.alt_architect,
                style: data.style || data.style_prim,
                year: data.year_built?.toString() ||
                    data.build_year?.toString(),
                materials: materialsArray.length > 0
                    ? materialsArray.join(", ")
                    : undefined,
                use: data.building_type || data.build_type || data.use_original,
                type: data.building_type || data.build_type,
                latitude: parseFloat(data.geocoded_lat) || undefined,
                longitude: parseFloat(data.geocoded_lng) || undefined,
                borough: data.borough_name || data.borough,
                primaryAesthetic: data.primary_aesthetic,
            };
        });

        // Filter out buildings without valid coordinates if we need proximity sorting
        let validBuildings = buildings.filter((b) => b.name && b.address);

        // For materials filtering, score buildings by how many materials match
        if (params.filterType === "materials" && materialsToMatch.length > 0) {
            validBuildings = validBuildings.map((b) => {
                const buildingMaterials = [
                    b.materials || "",
                ].join(" ").toLowerCase();

                // Count how many of the search materials match this building
                let matchCount = 0;
                for (const mat of materialsToMatch) {
                    if (buildingMaterials.includes(mat)) {
                        matchCount++;
                    }
                }
                return { ...b, materialMatchCount: matchCount };
            });

            // Sort by material match count (descending), then by BIN for stability
            validBuildings.sort((a, b) => {
                const aMatch = (a as any).materialMatchCount || 0;
                const bMatch = (b as any).materialMatchCount || 0;
                if (bMatch !== aMatch) return bMatch - aMatch;
                // Use BIN as stable tiebreaker (distance added later)
                return (a.bin || "").localeCompare(b.bin || "");
            });

            console.log(
                "[buildingService] Material matches:",
                validBuildings.slice(0, 5).map((b) => ({
                    name: b.name,
                    materials: b.materials,
                    matchCount: (b as any).materialMatchCount,
                })),
            );
        }

        // If we have current coordinates, sort by proximity (for non-material filters)
        if (
            params.currentLat && params.currentLng &&
            params.filterType !== "materials"
        ) {
            validBuildings = validBuildings
                .filter((b) => b.latitude && b.longitude)
                .map((b) => {
                    // Calculate distance using Haversine formula
                    const R = 6371; // Earth's radius in km
                    const dLat = (b.latitude! - params.currentLat!) * Math.PI /
                        180;
                    const dLng = (b.longitude! - params.currentLng!) * Math.PI /
                        180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(params.currentLat! * Math.PI / 180) *
                            Math.cos(b.latitude! * Math.PI / 180) *
                            Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;
                    return { ...b, distance };
                })
                .sort((a, b) => {
                    const distDiff = (a.distance || 0) - (b.distance || 0);
                    if (distDiff !== 0) return distDiff;
                    // Use BIN as stable tiebreaker
                    return (a.bin || "").localeCompare(b.bin || "");
                });
        } else if (
            params.filterType === "materials" && params.currentLat &&
            params.currentLng
        ) {
            // For materials, add distance but keep material match count as primary sort
            validBuildings = validBuildings
                .filter((b) => b.latitude && b.longitude)
                .map((b) => {
                    const R = 6371;
                    const dLat = (b.latitude! - params.currentLat!) * Math.PI /
                        180;
                    const dLng = (b.longitude! - params.currentLng!) * Math.PI /
                        180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(params.currentLat! * Math.PI / 180) *
                            Math.cos(b.latitude! * Math.PI / 180) *
                            Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return { ...b, distance: R * c };
                })
                .sort((a, b) => {
                    // Sort by match count first, then distance, then BIN for stability
                    const aMatch = (a as any).materialMatchCount || 0;
                    const bMatch = (b as any).materialMatchCount || 0;
                    if (bMatch !== aMatch) return bMatch - aMatch;
                    const distDiff = (a.distance || 0) - (b.distance || 0);
                    if (distDiff !== 0) return distDiff;
                    // Use BIN as stable tiebreaker
                    return (a.bin || "").localeCompare(b.bin || "");
                });
        }

        // Limit to requested number
        const finalBuildings = validBuildings.slice(0, limit);

        console.log("[buildingService] Related buildings found:", {
            total: result.data.length,
            valid: validBuildings.length,
            returned: finalBuildings.length,
        });

        return finalBuildings;
    } catch (err) {
        console.error("[buildingService] Error in fetchRelatedBuildings:", err);
        return [];
    }
}
