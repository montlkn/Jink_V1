import Foundation
import CoreLocation
import Supabase

@Observable
final class GPSGridCacheService {
    static let shared = GPSGridCacheService()
    private var cache: [String: Building] = [:]       // bin → Building
    private var cacheCenter: CLLocationCoordinate2D?
    private var lastRefresh: Date?

    private init() {}

    func initialize(lat: Double, lng: Double) async {
        guard shouldRefresh(lat: lat, lng: lng) else { return }

        // Query: buildings_full_merge_scanning with bounding box ±0.002° (~220m).
        // Uses SupabaseService.shared.buildingsClient. Stores up to 200 buildings in memory dict keyed by BIN.
        let minLat = lat - 0.002
        let maxLat = lat + 0.002
        let minLng = lng - 0.002
        let maxLng = lng + 0.002

        do {
            let fields = "bin, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic, normalized_profile"
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

            mergeBuildings(results)
            self.cacheCenter = CLLocationCoordinate2D(latitude: lat, longitude: lng)
            self.lastRefresh = Date()
            print("[GPSGridCacheService] Refreshed cache with \(results.count) buildings")
        } catch {
            print("[GPSGridCacheService] Error initializing cache: \(error.localizedDescription)")
        }
    }

    var allBuildings: [Building] { Array(cache.values) }

    func findByBIN(_ bin: String?) -> Building? {
        guard let bin = bin, !bin.isEmpty, bin != "unknown" else { return nil }
        let binStr = bin.replacingOccurrences(of: ".0", with: "")
        return cache[binStr] ?? cache["\(binStr).0"]
    }

    func findByGPS(lat: Double, lng: Double, radiusM: Double = 30) -> Building? {
        let center = CLLocation(latitude: lat, longitude: lng)
        var closest: Building? = nil
        var minDistance: Double = radiusM

        for building in cache.values {
            guard let bLat = building.latitude, let bLng = building.longitude else { continue }
            let bLoc = CLLocation(latitude: bLat, longitude: bLng)
            let dist = center.distance(from: bLoc)
            if dist <= minDistance {
                minDistance = dist
                closest = building
            }
        }
        return closest
    }

    func shouldRefresh(lat: Double, lng: Double) -> Bool {
        // >100m moved OR >30min old
        if lastRefresh == nil || cacheCenter == nil { return true }
        
        if let refresh = lastRefresh, Date().timeIntervalSince(refresh) > 30 * 60 {
            return true
        }

        if let center = cacheCenter {
            let currentLoc = CLLocation(latitude: lat, longitude: lng)
            let centerLoc = CLLocation(latitude: center.latitude, longitude: center.longitude)
            if currentLoc.distance(from: centerLoc) > 100 {
                return true
            }
        }

        return false
    }

    func mergeBuildings(_ buildings: [Building]) {
        for building in buildings {
            let binStr = building.bin.replacingOccurrences(of: ".0", with: "")
            cache[binStr] = building
        }
    }
}
