import Foundation
import Supabase

@Observable
final class PassportViewModel {
    var profile: Profile? = nil
    var aestheticProfile: AestheticProfile? = nil
    var stampCount: Int = 0
    var achievementCount: Int = 0
    var scanCount: Int = 0
    var walkSummaries: [WalkSummary] = []
    var scannedBuildings: [ScannedBuilding] = []
    var isLoading = false
    var errorMessage: String? = nil

    private var userId: String? = nil
    private var buildingInfoCache: [String: BuildingInfo] = [:]

    private struct BuildingInfo {
        var name: String?
        var address: String?
        var style: String?
        var yearBuilt: String?
        var architect: String?
    }

    var passportNumber: String {
        guard let userId = userId else { return "AR-0000-0000" }
        let raw = userId.replacingOccurrences(of: "[^a-zA-Z0-9]", with: "", options: .regularExpression).uppercased()
        guard raw.count >= 8 else { return "AR-0000-0000" }
        return "AR-\(raw.prefix(4))-\(raw.dropFirst(4).prefix(4))"
    }

    var issueDateLabel: String? {
        guard let date = profile?.createdAt else { return nil }
        let fmt = DateFormatter()
        fmt.dateFormat = "dd MMM yyyy"
        return fmt.string(from: date).uppercased()
    }

    func load(userId: String) async {
        self.userId = userId
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchProfile(userId: userId) }
            group.addTask { await self.fetchAestheticProfile(userId: userId) }
            group.addTask { await self.fetchStampCount(userId: userId) }
            group.addTask { await self.fetchAchievementCount(userId: userId) }
            group.addTask { await self.fetchWalkSummaries(userId: userId) }
            group.addTask { await self.fetchScannedBuildings(userId: userId) }
        }

        // Retroactively check achievements in a detached task so it won't get cancelled
        // when the view reappears
        Task.detached { [weak self] in
            await ProgressService.shared.checkAndAwardAchievementsPublic(userId: userId)
            // Re-fetch counts after potential new awards
            await self?.fetchAchievementCount(userId: userId)
            await self?.fetchStampCount(userId: userId)
        }
    }

    // MARK: - Fetchers

    private func fetchProfile(userId: String) async {
        do {
            let rows: [Profile] = try await SupabaseService.shared.client
                .from("profiles")
                .select("id, username, total_xp, level, level_title, level_tier, daily_streak_count")
                .eq("id", value: userId)
                .execute()
                .value
            if let row = rows.first {
                profile = row
                print("[PassportViewModel] Profile loaded: \(row.totalXp) XP, level \(row.level)")
            }
        } catch {
            print("[PassportViewModel] Profile fetch error: \(error)")
        }
    }

    private func fetchAchievementCount(userId: String) async {
        do {
            let data = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            achievementCount = data.count ?? 0
        } catch {
            print("[PassportViewModel] Achievement count error: \(error)")
        }
    }

    private func fetchAestheticProfile(userId: String) async {
        do {
            struct AestheticRow: Decodable {
                let normalizedScores: AestheticProfile?
                enum CodingKeys: String, CodingKey {
                    case normalizedScores = "normalized_scores"
                }
            }
            let rows: [AestheticRow] = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .execute()
                .value
            if let first = rows.first {
                aestheticProfile = first.normalizedScores
                print("[PassportViewModel] Aesthetic profile loaded: \(aestheticProfile?.dominant?.name ?? "none")")
            }
        } catch {
            print("[PassportViewModel] Aesthetic profile error: \(error)")
        }
    }

    private func fetchStampCount(userId: String) async {
        do {
            let data = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("id", head: true, count: .exact)
                .eq("user_id", value: userId)
                .execute()
            stampCount = data.count ?? 0
        } catch {
            print("[PassportViewModel] Stamps count error: \(error)")
        }
    }

    private func fetchScannedBuildings(userId: String) async {
        do {
            let uniqueScans = try await fetchRawScans(userId: userId)

            // Phase 1: Build list immediately with cached data
            scannedBuildings = buildScannedList(from: uniqueScans, infoMap: buildingInfoCache)
            scanCount = scannedBuildings.count

            // Phase 2: Enrich uncached BINs in background
            let uncachedBins = uniqueScans.map(\.bin).filter { buildingInfoCache[$0] == nil }
            if !uncachedBins.isEmpty {
                let newInfo = await enrichBuildings(bins: uncachedBins)
                for (bin, info) in newInfo {
                    buildingInfoCache[bin] = info
                }
                scannedBuildings = buildScannedList(from: uniqueScans, infoMap: buildingInfoCache)
                scanCount = scannedBuildings.count
            }
        } catch {
            print("[PassportViewModel] Scanned buildings error: \(error)")
        }
    }

    private func fetchRawScans(userId: String) async throws -> [(bin: String, photoUrl: String?, address: String?, date: Date?)] {
        struct ScanRow: Decodable {
            let confirmedBin: String?
            let userPhotoUrl: String?
            let userContributedAddress: String?
            let createdAt: Date?
            enum CodingKeys: String, CodingKey {
                case confirmedBin = "confirmed_bin"
                case userPhotoUrl = "user_photo_url"
                case userContributedAddress = "user_contributed_address"
                case createdAt = "created_at"
            }
        }
        let rows: [ScanRow] = try await SupabaseService.shared.buildingsClient
            .from("scans")
            .select("confirmed_bin, user_photo_url, user_contributed_address, created_at")
            .eq("user_id", value: userId)
            .not("confirmed_bin", operator: .is, value: "null")
            .order("created_at", ascending: false)
            .execute()
            .value

        var seenBins = Set<String>()
        var uniqueScans: [(bin: String, photoUrl: String?, address: String?, date: Date?)] = []
        for row in rows {
            guard let bin = row.confirmedBin, !bin.isEmpty, !seenBins.contains(bin) else { continue }
            seenBins.insert(bin)
            uniqueScans.append((bin: bin, photoUrl: row.userPhotoUrl, address: row.userContributedAddress, date: row.createdAt))
        }
        return uniqueScans
    }

    private func enrichBuildings(bins: [String]) async -> [String: BuildingInfo] {
        struct BuildingRow: Decodable {
            let bin: String
            let buildingName: String?
            let address: String?
            let style: String?
            let architect: String?
            let yearBuilt: String?
            enum CodingKeys: String, CodingKey {
                case bin
                case buildingName = "building_name"
                case address, style, architect
                case yearBuilt = "year_built"
            }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                if let binInt = try? c.decode(Int.self, forKey: .bin) {
                    bin = String(binInt)
                } else if let binDouble = try? c.decode(Double.self, forKey: .bin) {
                    bin = String(Int(binDouble))
                } else {
                    bin = (try? c.decode(String.self, forKey: .bin)) ?? ""
                }
                buildingName = try c.decodeIfPresent(String.self, forKey: .buildingName)
                address = try c.decodeIfPresent(String.self, forKey: .address)
                style = try c.decodeIfPresent(String.self, forKey: .style)
                architect = try c.decodeIfPresent(String.self, forKey: .architect)
                yearBuilt = try c.decodeIfPresent(String.self, forKey: .yearBuilt)
            }
        }

        let binSuffixed = bins.map { "\($0).0" }
        let allBins = bins + binSuffixed

        var result: [String: BuildingInfo] = [:]
        guard let buildingRows: [BuildingRow] = try? await SupabaseService.shared.buildingsClient
            .from("buildings_full_merge_scanning")
            .select("bin, building_name, address, style, architect, year_built")
            .in("bin", values: allBins)
            .execute()
            .value else { return result }

        for row in buildingRows {
            let cleanBin = row.bin.replacingOccurrences(of: ".0", with: "")
            let name = row.buildingName.flatMap { $0 == "0" || $0.isEmpty ? nil : $0 }
            let addr = row.address.flatMap { $0.isEmpty ? nil : $0 }
            let style = row.style.flatMap { $0.isEmpty || $0 == "0" ? nil : $0 }
            let year = row.yearBuilt.flatMap { $0.isEmpty || $0 == "0" ? nil : $0.replacingOccurrences(of: ".0", with: "") }
            let arch = row.architect.flatMap { $0.isEmpty || $0 == "0" ? nil : $0 }
            result[cleanBin] = BuildingInfo(name: name, address: addr, style: style, yearBuilt: year, architect: arch)
        }
        print("[PassportViewModel] Enriched \(result.count) buildings for \(bins.count) BINs")
        return result
    }

    private func buildScannedList(from scans: [(bin: String, photoUrl: String?, address: String?, date: Date?)], infoMap: [String: BuildingInfo]) -> [ScannedBuilding] {
        scans.compactMap { scan in
            let info = infoMap[scan.bin]
            let building = ScannedBuilding(
                bin: scan.bin,
                name: info?.name,
                address: scan.address ?? info?.address,
                photoUrl: scan.photoUrl,
                scannedAt: scan.date,
                style: info?.style,
                yearBuilt: info?.yearBuilt,
                architect: info?.architect
            )
            // Filter out "Unknown Building" entries
            return building.displayName == "Unknown Building" ? nil : building
        }
    }

    private func fetchWalkSummaries(userId: String) async {
        do {
            let summaries: [WalkSummary] = try await SupabaseService.shared.client
                .from("walk_summaries")
                .select("id, started_at, ended_at, distance_km, borough")
                .eq("user_id", value: userId)
                .not("ended_at", operator: .is, value: "null")
                .order("ended_at", ascending: false)
                .limit(5)
                .execute()
                .value
            walkSummaries = summaries
        } catch {
            print("[PassportViewModel] Walk summaries error: \(error)")
        }
    }
}
