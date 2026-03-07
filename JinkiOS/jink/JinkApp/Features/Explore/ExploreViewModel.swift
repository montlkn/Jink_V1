import Foundation
import CoreLocation
import Supabase

@Observable
final class ExploreViewModel {
    var buildings: [Building] = []
    var selectedBuilding: Building? = nil
    var isLoading = false

    func load(near coordinate: CLLocationCoordinate2D) async {
        // Try GPSGridCacheService first (populated by ScanView)
        let cached = GPSGridCacheService.shared.allBuildings
        if !cached.isEmpty {
            buildings = cached
            return
        }

        // Fall back to direct bounding box query
        isLoading = true
        defer { isLoading = false }

        let lat = coordinate.latitude
        let lng = coordinate.longitude
        let minLat = lat - 0.002
        let maxLat = lat + 0.002
        let minLng = lng - 0.002
        let maxLng = lng + 0.002

        do {
            let fields = "bin, bbl, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic, aesthetic_profile"
            let results: [Building] = try await SupabaseService.shared.buildingsClient
                .from("buildings_full_merge_scanning")
                .select(fields)
                .gte("geocoded_lat", value: minLat)
                .lte("geocoded_lat", value: maxLat)
                .gte("geocoded_lng", value: minLng)
                .lte("geocoded_lng", value: maxLng)
                .limit(200)
                .execute()
                .value
            buildings = results
            GPSGridCacheService.shared.mergeBuildings(results)
        } catch {
            print("[ExploreViewModel] ❌ load failed: \(error)")
        }
    }
}
