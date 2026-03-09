import Foundation
import CoreLocation
import Supabase

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))
        return (self * factor).rounded() / factor
    }
}

@Observable
final class ExploreViewModel {
    var buildings: [Building] = []
    var selectedBuilding: Building? = nil
    var isLoading = false
    var userAestheticVector: [String: Double] = [:]
    var loadCenter: CLLocationCoordinate2D?

    func load(near coordinate: CLLocationCoordinate2D, userId: String? = nil) async {
        isLoading = true
        defer { isLoading = false }
        loadCenter = coordinate

        // Run profile fetch and building fetch in parallel
        async let profileFetch: Void = {
            if let uid = userId { await self.fetchUserProfile(userId: uid) }
        }()

        // geocoded_lat and geocoded_lng are TEXT columns with no composite index.
        // Strategy: lat-only LIKE with 3-decimal prefixes (~110m bands), paginated
        // in parallel. Each band has <500 rows in even the densest Manhattan blocks,
        // safely under PostgREST's 1000-row page cap.
        // ±0.015° window = 30 × 0.001° bands. We generate all bands in range.
        let latBands = latBandSet(for: coordinate.latitude, delta: 0.015)

        let fields = "bin, bbl, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic"

        var allResults: [Building] = []

        await withTaskGroup(of: [Building].self) { group in
            for band in latBands {
                group.addTask {
                    do {
                        return try await SupabaseService.shared.buildingsClient
                            .from("buildings_full_merge_scanning")
                            .select(fields)
                            .like("geocoded_lat", pattern: "\(band)%")
                            .limit(500)
                            .execute()
                            .value
                    } catch {
                        print("[ExploreViewModel] ❌ prefix query failed (\(band)): \(error)")
                        return []
                    }
                }
            }
            for await batch in group {
                allResults.append(contentsOf: batch)
            }
        }

        // Dedup by bin — use coordinate string as fallback if bin is empty
        var seen = Set<String>()
        let deduped = allResults.filter { b in
            let key = b.bin.isEmpty ? "\(b.latitude ?? 0),\(b.longitude ?? 0)" : b.bin
            return seen.insert(key).inserted
        }

        // Client-side precise filter: ±0.015° (~1.5km)
        let lat = coordinate.latitude
        let lng = coordinate.longitude
        let delta = 0.015
        let nearby = deduped.filter { b in
            guard let bLat = b.latitude, let bLng = b.longitude else { return false }
            return abs(bLat - lat) <= delta && abs(bLng - lng) <= delta
        }

        print("[ExploreViewModel] ✅ fetched \(allResults.count) raw, \(deduped.count) deduped, \(nearby.count) within 1.5km")
        buildings = nearby
        GPSGridCacheService.shared.mergeBuildings(nearby)

        await profileFetch
    }

    /// Returns all 3-decimal lat prefixes covering [value-delta, value+delta].
    /// Each band is ~110m tall; at 500 rows/band this covers even dense Manhattan.
    private func latBandSet(for value: Double, delta: Double) -> [String] {
        let step = 0.001
        let low  = (value - delta).rounded(toPlaces: 3)
        let high = (value + delta).rounded(toPlaces: 3)
        var bands: [String] = []
        var v = low
        while v <= high + 1e-9 {
            bands.append(String(format: "%.3f", v))
            v = (v + step).rounded(toPlaces: 3)
        }
        return bands
    }

    private func fetchUserProfile(userId: String) async {
        do {
            struct AestheticRow: Decodable {
                let normalizedScores: AestheticProfile?
                enum CodingKeys: String, CodingKey { case normalizedScores = "normalized_scores" }
            }
            let row: AestheticRow = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .single()
                .execute()
                .value
            guard let profile = row.normalizedScores else { return }
            var vec: [String: Double] = [:]
            for item in profile.all {
                vec[item.name.lowercased()] = item.score
            }
            userAestheticVector = vec
        } catch {
            print("[ExploreViewModel] ❌ fetchUserProfile failed: \(error)")
        }
    }

    func matchScore(for building: Building) -> Double {
        guard !userAestheticVector.isEmpty else { return 0 }

        // Use full aesthetic profile if available
        if let profile = building.aestheticProfile {
            var dot = 0.0
            for item in profile.all {
                let key = item.name.lowercased()
                dot += item.score * (userAestheticVector[key] ?? 0)
            }
            return min(max(dot, 0), 1)
        }

        // Fallback: give partial score based on primary aesthetic match
        if let primary = building.primaryAesthetic?.lowercased(),
           let score = userAestheticVector[primary] {
            return min(max(score, 0), 1)
        }

        return 0
    }

    // MARK: - Search
    
    func search(query: String) async {
        guard !query.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Very simple search using ilike on name or address
            let data = try await SupabaseService.shared.client
                .from("buildings_full_merge_scanning")
                .select()
                .or("name.ilike.%\(query)%,address.ilike.%\(query)%")
                .limit(20)
                .execute()
            
            let decoder = JSONDecoder()
            let decoded = try decoder.decode([Building].self, from: data.data)
            
            if !decoded.isEmpty {
                buildings = decoded
            }
        } catch {
            print("[ExploreViewModel] ❌ Search error: \(error)")
        }
    }
}
