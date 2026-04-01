import SwiftUI
import Auth
import Supabase

// MARK: - ViewModel

@Observable
final class BuildingInfoViewModel {
    var building: Building? = nil
    var isLoading = false
    var errorMessage: String? = nil
    var isLiked = false
    var isDisliked = false
    var contributedMaterials: String? = nil

    /// Instantly populate building from scan match data (no network)
    func loadFromMatch(_ match: ScanMatch) {
        guard building == nil else { return }
        building = Building.placeholder(
            bin: match.bin,
            bbl: match.bbl,
            name: match.name ?? "",
            address: match.address ?? "",
            latitude: match.latitude,
            longitude: match.longitude,
            style: match.style,
            yearBuilt: match.yearBuilt,
            architect: match.architect,
            materials: match.materials
        )
    }

    func load(bin: String? = nil, name: String? = nil, latitude: Double? = nil, longitude: Double? = nil) async {
        let hadPrefetch = building != nil
        if !hadPrefetch { isLoading = true }
        errorMessage = nil
        defer { isLoading = false }

        let table = "buildings_full_merge_scanning"
        let fields = "bin, bbl, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic, normalized_profile, hero_image_url"

        // Priority 1: BIN lookup — run exact and .0-suffix in parallel
        if let bin, !bin.isEmpty, bin != "unknown" {
            let binStr = bin.replacingOccurrences(of: ".0", with: "")

            let (exactResults, suffixedResults): ([Building]?, [Building]?) = await (
                (try? await withTimeout(seconds: 3) {
                    try await SupabaseService.shared.buildingsClient
                        .from(table).select(fields).eq("bin", value: binStr).limit(1).execute().value
                }),
                (try? await withTimeout(seconds: 3) {
                    try await SupabaseService.shared.buildingsClient
                        .from(table).select(fields).eq("bin", value: "\(binStr).0").limit(1).execute().value
                })
            )

            if let first = exactResults?.first ?? suffixedResults?.first {
                self.building = first
                await fetchContributedMaterials()
                return
            }
        }

        // Priority 2: Name lookup (fast indexed eq)
        if let name, !name.isEmpty {
            let results: [Building]? = try? await withTimeout(seconds: 3) {
                try await SupabaseService.shared.buildingsClient
                    .from(table).select(fields).eq("building_name", value: name).limit(1).execute().value
            }
            if let first = results?.first {
                self.building = first
                await fetchContributedMaterials()
                return
            }
        }

        // Priority 3: GPS lookup (slowest — only if nothing else matched)
        if let lat = latitude, let lng = longitude {
            let results: [Building]? = try? await withTimeout(seconds: 4) {
                try await SupabaseService.shared.buildingsClient
                    .from(table).select(fields)
                    .gte("geocoded_lat", value: lat - 0.0005).lte("geocoded_lat", value: lat + 0.0005)
                    .gte("geocoded_lng", value: lng - 0.0005).lte("geocoded_lng", value: lng + 0.0005)
                    .limit(1).execute().value
            }
            if let first = results?.first {
                self.building = first
                await fetchContributedMaterials()
                return
            }
        }

        errorMessage = "Building data unavailable"
    }

    private func fetchContributedMaterials() async {
        guard let b = building, b.materials == nil || (b.materials?.isEmpty == true) else { return }
        if let contributed = try? await SupabaseService.shared.client
            .from("building_contributions")
            .select("mat_prim")
            .eq("confirmed_bin", value: b.bin)
            .not("mat_prim", operator: .is, value: "null")
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value as [[String: String?]],
           let mat = contributed.first?["mat_prim"] as? String, !mat.isEmpty {
            self.contributedMaterials = mat
        }
    }

    private func withTimeout<T>(seconds: TimeInterval, operation: @escaping @Sendable () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw URLError(.timedOut)
            }
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
    
    func toggleLike(userId: String, appState: AppState) {
        guard !isLiked, let building = building else { return }
        isLiked = true
        isDisliked = false
        PostHogService.shared.capture("building_liked", properties: ["building_bin": building.bin ?? ""])
        sendAestheticEvent(userId: userId, building: building, subtype: "like", appState: appState)
    }

    func toggleDislike(userId: String, appState: AppState) {
        guard !isDisliked, let building = building else { return }
        isDisliked = true
        isLiked = false
        PostHogService.shared.capture("building_disliked", properties: ["building_bin": building.bin ?? ""])
        sendAestheticEvent(userId: userId, building: building, subtype: "dislike", appState: appState)
    }

    func recordDwellTime(userId: String, timeSpentSeconds: TimeInterval, appState: AppState) {
        guard timeSpentSeconds > 10, let building = building else { return }
        sendAestheticEvent(userId: userId, building: building, subtype: "dwell", appState: appState)
    }

    private func sendAestheticEvent(userId: String, building: Building, subtype: String, appState: AppState) {
        Task {
            do {
                try await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: building.bbl ?? building.bin,
                    aestheticVector: building.aestheticProfile.map { profile in
                        var dict: [String: Double] = [:]
                        for item in profile.all { dict[item.name.lowercased()] = item.score }
                        return dict
                    },
                    subtype: subtype
                )
                // Process the event into the profile (triggers the RPC aggregation)
                _ = await AestheticService.shared.processProfile(userId: userId)
                // Refresh the local profile state + trigger passport reload
                await appState.refreshAestheticProfile()
                await MainActor.run { appState.passportRefreshTrigger += 1 }
            } catch {
                print("[BuildingInfoViewModel] Failed to send aesthetic event: \(error)")
            }
        }
    }
}
