import { buildingsSupabaseClient } from "./gateways/buildingsSupabaseClient";

export type BuildingSearchResult = {
  id: string;
  bin: string;
  name: string;
  address: string;
  style?: string;
  year?: string;
  latitude?: number;
  longitude?: number;
  architect?: string;
  materials?: string;
};

const SEARCH_TIMEOUT = 5000;

/**
 * Search buildings by name or address with timeout protection
 */
export async function searchBuildings(
  query: string,
  limit = 10
): Promise<BuildingSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  if (!buildingsSupabaseClient) {
    console.warn("[buildingSearchService] Supabase client not available");
    return [];
  }

  const searchTerm = query.trim();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn("[buildingSearchService] Search timed out");
        resolve(null);
      }, SEARCH_TIMEOUT);
    });

    // Search query - search both building_name and address
    const searchPromise = buildingsSupabaseClient
      .from("buildings_full_merge_scanning")
      .select("bin, building_name, address, style, year_built, geocoded_lat, geocoded_lng, architect, mat_prim")
      .or(`building_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .limit(limit);

    const result = await Promise.race([searchPromise, timeoutPromise]);

    if (!result || !("data" in result)) {
      return [];
    }

    const { data, error } = result;

    if (error) {
      console.error("[buildingSearchService] Search error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map results to our format
    const results: BuildingSearchResult[] = data.map((row: any) => ({
      id: row.bin?.toString().replace(/\.0$/, "") || `temp_${Math.random()}`,
      bin: row.bin?.toString().replace(/\.0$/, "") || "",
      name: row.building_name || row.address || "Unknown Building",
      address: row.address || "",
      style: row.style || undefined,
      year: row.year_built?.toString() || undefined,
      latitude: row.geocoded_lat || undefined,
      longitude: row.geocoded_lng || undefined,
      architect: row.architect || undefined,
      materials: row.mat_prim || undefined,
    }));

    console.log("[buildingSearchService] Found", results.length, "results for:", searchTerm);
    return results;
  } catch (error) {
    console.error("[buildingSearchService] Search failed:", error);
    return [];
  }
}

/**
 * Create a debounced search function
 * Returns a function that can be called with a query, and will only execute after delay
 */
export function createDebouncedSearch(
  onResults: (results: BuildingSearchResult[]) => void,
  onLoading: (loading: boolean) => void,
  delay = 300
): {
  search: (query: string) => void;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  const search = (query: string) => {
    // Cancel previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Cancel previous request conceptually (we can't abort Supabase, but we can ignore result)
    if (abortController) {
      abortController.abort();
    }

    if (!query || query.trim().length < 2) {
      onResults([]);
      onLoading(false);
      return;
    }

    onLoading(true);
    abortController = new AbortController();
    const currentController = abortController;

    timeoutId = setTimeout(async () => {
      try {
        const results = await searchBuildings(query);

        // Only update if this request wasn't cancelled
        if (!currentController.signal.aborted) {
          onResults(results);
        }
      } catch (error) {
        if (!currentController.signal.aborted) {
          console.error("[buildingSearchService] Debounced search error:", error);
          onResults([]);
        }
      } finally {
        if (!currentController.signal.aborted) {
          onLoading(false);
        }
      }
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    onLoading(false);
  };

  return { search, cancel };
}
