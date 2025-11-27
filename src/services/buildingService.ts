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
