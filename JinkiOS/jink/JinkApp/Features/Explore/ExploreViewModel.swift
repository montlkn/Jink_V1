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
    var searchResults: [Building] = [] // Separate list for search results
    var selectedBuilding: Building? = nil
    var isLoading = false
    var userAestheticVector: [String: Double] = [:]
    var loadCenter: CLLocationCoordinate2D?

    func load(near coordinate: CLLocationCoordinate2D, userId: String? = nil) async {
        isLoading = true
        defer { isLoading = false }
        loadCenter = coordinate
        searchResults = [] // Clear search results when just browsing

        // Run profile fetch and building fetch in parallel
        async let profileFetch: Void = {
            if let uid = userId { await self.fetchUserProfile(userId: uid) }
        }()

        do {
            let params: [String: AnyJSON] = [
                "lat": .double(coordinate.latitude),
                "lng": .double(coordinate.longitude),
                "radius_km": .double(2.0),
                "max_results": .integer(250)
            ]
            
            struct BuildingRow: Decodable {
                let bin: String?
                let bbl: String?
                let building_name: String?
                let address: String?
                let style: String?
                let storytelling: String?
                let primary_aesthetic: String?
                let geocoded_lat: String?
                let geocoded_lng: String?
                let architect: String?
                let year_built: String?
                let mat_prim: String?
                let normalized_profile: AnyValue?
            }
            
            let rows: [BuildingRow] = try await SupabaseService.shared.buildingsClient
                .rpc("nearby_buildings", params: params)
                .execute()
                .value
            
            let nearby = rows.compactMap { row -> Building? in
                guard let bLat = row.geocoded_lat.flatMap(Double.init),
                      let bLng = row.geocoded_lng.flatMap(Double.init) else { return nil }
                      
                let name = (row.building_name != nil && row.building_name != "0" && !row.building_name!.isEmpty) ? row.building_name! : row.address ?? "Building"
                
                var aestheticProfile: AestheticProfile? = nil
                if let val = row.normalized_profile {
                    var dict: [String: Double] = [:]
                    switch val {
                    case .string(let str):
                        if let data = str.data(using: .utf8),
                           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                            for (k, v) in parsed {
                                if let doubleVal = v as? Double {
                                    dict[k] = doubleVal
                                } else if let strVal = v as? String, let doubleVal = Double(strVal) {
                                    dict[k] = doubleVal
                                }
                            }
                        }
                    case .dictionary(let d):
                        dict = d
                    case .fallback: break
                    }
                    if !dict.isEmpty {
                        let sum = dict.values.reduce(0, +)
                        let factor = sum > 0 ? (sum > 1.0 ? sum : 1.0) : 1.0
                        
                        func score(_ key: String) -> Double {
                            let raw = dict[key] ?? 0.0
                            return sum > 1.0 ? raw / factor : raw
                        }
                        aestheticProfile = AestheticProfile(
                            classicist: score("classicist"), romantic: score("romantic"), stylist: score("stylist"),
                            modernist: score("modernist"), industrialist: score("industrialist"), visionary: score("visionary"),
                            popCulturalist: score("pop_culturalist"), vernacularist: score("vernacularist"), austerist: score("austerist")
                        )
                    }
                }
                
                return Building.placeholder(
                    bin: row.bin ?? "",
                    bbl: row.bbl,
                    name: name,
                    address: row.address ?? "",
                    latitude: bLat,
                    longitude: bLng,
                    primaryAesthetic: row.primary_aesthetic,
                    secondaryAesthetic: nil,
                    storytelling: row.storytelling,
                    style: row.style,
                    yearBuilt: row.year_built,
                    architect: row.architect,
                    materials: row.mat_prim,
                    aestheticProfile: aestheticProfile
                )
            }
            
            // Deduplicate buildings with same name/address within tight radius (e.g., Empire State)
            var uniqueBuildings: [Building] = []
            for b in nearby {
                let duplicateIndex = uniqueBuildings.firstIndex { u in
                    u.name == b.name || u.address == b.address
                }
                
                if let idx = duplicateIndex {
                    let existing = uniqueBuildings[idx]
                    let existingHasStory = (existing.description?.count ?? 0) > 0
                    let newHasStory = (b.description?.count ?? 0) > 0
                    
                    if newHasStory && !existingHasStory {
                        uniqueBuildings[idx] = b
                    }
                } else {
                    uniqueBuildings.append(b)
                }
            }
            
            print("[ExploreViewModel]  fetched \(uniqueBuildings.count) unique buildings via RPC (from \(nearby.count) raw)")
            buildings = uniqueBuildings
            GPSGridCacheService.shared.mergeBuildings(uniqueBuildings)
        } catch {
            print("[ExploreViewModel]  nearby_buildings RPC failed: \(error)")
        }

        await profileFetch
    }

    enum AnyValue: Decodable {
        case string(String)
        case dictionary([String: Double])
        case fallback

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let dictValue = try? container.decode([String: Double].self) {
                self = .dictionary(dictValue)
            } else if let stringValue = try? container.decode(String.self) {
                self = .string(stringValue)
            } else {
                self = .fallback
            }
        }
    }

    private func fetchUserProfile(userId: String) async {
        do {
            struct AestheticRow: Decodable {
                let normalizedScores: AnyValue?
                enum CodingKeys: String, CodingKey { case normalizedScores = "normalized_scores" }
            }
            let rows: [AestheticRow] = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .execute()
                .value
            
            guard let val = rows.first?.normalizedScores else {
                return
            }

            var dict: [String: Double] = [:]
            switch val {
            case .string(let str):
                if let data = str.data(using: .utf8),
                   let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Double] {
                    dict = parsed
                }
            case .dictionary(let d):
                dict = d
            case .fallback:
                break
            }

            var vec: [String: Double] = [:]
            for (key, val) in dict {
                let normalizedKey = key.lowercased()
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                    .replacingOccurrences(of: " ", with: "")
                    .replacingOccurrences(of: "_", with: "")
                
                vec[normalizedKey] = val > 1.0 ? val / 100.0 : val
            }
            userAestheticVector = vec
            print("[ExploreViewModel]  fetchUserProfile loaded vector: \(vec.count) keys")
        } catch {
            print("[ExploreViewModel]  fetchUserProfile failed: \(error)")
        }
    }

    func matchScore(for building: Building) -> Double {
        guard !userAestheticVector.isEmpty else { return 0 }
        let score = calculateScore(for: building, against: userAestheticVector)
        // Extremely generous power curve (pow ^ 0.25)
        return pow(score, 0.25)
    }

    // MARK: - Search
    
    func search(query: String, center: CLLocationCoordinate2D? = nil) async {
        guard !query.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let fields = "bin, bbl, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic, normalized_profile"
            let table = "buildings_full_merge_scanning"
            
            let cleanQuery = query.trimmingCharacters(in: .whitespaces)
            let queryLower = cleanQuery.lowercased()
            let wildcardSearch = "*\(cleanQuery)*"
            
            var results: [Building] = try await SupabaseService.shared.buildingsClient
                .from(table)
                .select(fields)
                .or("building_name.ilike.\(wildcardSearch),address.ilike.\(wildcardSearch),style.ilike.\(wildcardSearch),primary_aesthetic.ilike.\(wildcardSearch),mat_prim.ilike.\(wildcardSearch),year_built.ilike.\(wildcardSearch)")
                .limit(100)
                .execute()
                .value

            // 2. Semantic query detection
            var targetVector: [String: Double] = [:]
            
            if queryLower.contains("gargoyle") || queryLower.contains("gothic") || queryLower.contains("tudor") || queryLower.contains("romantic") || queryLower.contains("ornate") || queryLower.contains("revival") {
                targetVector["romantic"] = 1.0
            } else if queryLower.contains("modern") || queryLower.contains("glass") || queryLower.contains("steel") || queryLower.contains("international") {
                targetVector["modernist"] = 1.0
            } else if queryLower.contains("deco") || queryLower.contains("nouveau") || queryLower.contains("stylist") || queryLower.contains("elegant") {
                targetVector["stylist"] = 1.0
            } else if queryLower.contains("industrial") || queryLower.contains("factory") || queryLower.contains("warehouse") || queryLower.contains("manufacturing") || queryLower.contains("exposed") {
                targetVector["industrialist"] = 1.0
            } else if queryLower.contains("classic") || queryLower.contains("beaux") || queryLower.contains("greek") || queryLower.contains("roman") || queryLower.contains("renaissance") || queryLower.contains("stone") || queryLower.contains("marble") {
                targetVector["classicist"] = 1.0
            } else if queryLower.contains("minimal") || queryLower.contains("brutal") || queryLower.contains("austerist") || queryLower.contains("simple") || queryLower.contains("concrete") {
                targetVector["austerist"] = 1.0
            } else if queryLower.contains("future") || queryLower.contains("visionary") || queryLower.contains("experimental") {
                targetVector["visionary"] = 1.0
            } else if queryLower.contains("vernacular") || queryLower.contains("rooted") || queryLower.contains("local") || queryLower.contains("colonial") || queryLower.contains("neighborhood") || queryLower.contains("brick") || queryLower.contains("terra cotta") {
                targetVector["vernacularist"] = 1.0
            }

            // 3. Distance calculation and Re-ranking
            let mapCenter = center.map { CLLocation(latitude: $0.latitude, longitude: $0.longitude) }
            let vectorToMatch = targetVector.isEmpty ? userAestheticVector : targetVector
            
            results.sort { b1, b2 in
                let n1 = b1.name?.lowercased() ?? ""
                let n2 = b2.name?.lowercased() ?? ""
                
                let exact1 = n1 == queryLower ? 1 : 0
                let exact2 = n2 == queryLower ? 1 : 0
                if exact1 != exact2 { return exact1 > exact2 }
                
                let pre1 = n1.hasPrefix(queryLower) ? 1 : 0
                let pre2 = n2.hasPrefix(queryLower) ? 1 : 0
                if pre1 != pre2 { return pre1 > pre2 }
                
                let match1 = calculateScore(for: b1, against: vectorToMatch)
                let match2 = calculateScore(for: b2, against: vectorToMatch)
                if abs(match1 - match2) > 0.05 { return match1 > match2 }
                
                if let centerLoc = mapCenter {
                    let d1 = b1.latitude.map { centerLoc.distance(from: CLLocation(latitude: $0, longitude: b1.longitude ?? 0)) } ?? Double.infinity
                    let d2 = b2.latitude.map { centerLoc.distance(from: CLLocation(latitude: $0, longitude: b2.longitude ?? 0)) } ?? Double.infinity
                    if abs(d1 - d2) > 1000 { return d1 < d2 }
                }
                return match1 > match2
            }

            buildings = results
            searchResults = results
        } catch {
            print("[ExploreViewModel]  Search error: \(error)")
        }
    }

    private func calculateScore(for building: Building, against vector: [String: Double]) -> Double {
        var rawScore = 0.0
        if let profile = building.aestheticProfile {
            var dot = 0.0
            for item in profile.all {
                let key = item.name.lowercased()
                    .replacingOccurrences(of: " ", with: "")
                    .replacingOccurrences(of: "_", with: "")
                dot += item.score * (vector[key] ?? 0)
            }
            rawScore = dot
        } else {
            let aesthetic = (building.primaryAesthetic ?? building.style)?.lowercased() ?? ""
            
            func bucketMatch(_ keywords: [String], _ key: String) -> Double {
                for k in keywords { if aesthetic.contains(k) { return vector[key] ?? 0 } }
                return 0
            }
            
            rawScore = [
                bucketMatch(["vernacular", "local", "colonial", "neighborhood", "garden", "revival", "brick", "wood"], "vernacularist"),
                bucketMatch(["modern", "international", "steel", "glass"], "modernist"),
                bucketMatch(["classic", "beaux", "greek", "roman", "renaissance", "stone", "marble"], "classicist"),
                bucketMatch(["gothic", "tudor", "romantic", "queen anne", "atmospheric"], "romantic"),
                bucketMatch(["deco", "nouveau", "stylist", "elegant", "decorative"], "stylist"),
                bucketMatch(["industrial", "factory", "warehouse", "exposed"], "industrialist"),
                bucketMatch(["visionary", "future", "experimental"], "visionary"),
                bucketMatch(["minimal", "brutalist", "austerist", "simple", "concrete"], "austerist")
            ].max() ?? 0
        }
        
        if let lm = building.landmark, !lm.isEmpty, lm.lowercased() != "0", lm.lowercased() != "none" {
            rawScore += 0.05
        }
        return min(max(rawScore, 0), 1)
    }
}
