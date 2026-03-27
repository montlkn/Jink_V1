import Foundation
import Supabase

enum StampTab: String, CaseIterable {
    case all, building, quest, achievement

    var displayName: String {
        switch self {
        case .all: return "All"
        case .building: return "Buildings"
        case .quest: return "Quests"
        case .achievement: return "Achievements"
        }
    }
}

struct UserStamp: Identifiable {
    let id: String
    let stampId: String
    let issuedAt: Date?
    let sourceType: String?
}

struct StampWithDefinition: Identifiable {
    let id: String
    let userStamp: UserStamp
    let definition: StampDefinition?

    var title: String { definition?.title ?? "Stamp" }
    var description: String { definition?.description ?? "" }
    var rarity: StampRarity { definition?.rarity ?? .common }
    var series: String { definition?.series ?? "building" }
    var stampSlug: String { definition?.slug ?? "" }
    var earnedAt: Date? { userStamp.issuedAt }
}

@Observable
final class StampsViewModel {
    var stamps: [StampWithDefinition] = []
    var isLoading = false
    var errorMessage: String? = nil
    var selectedTab: StampTab = .all

    var filteredStamps: [StampWithDefinition] {
        guard selectedTab != .all else { return stamps }
        return stamps.filter { $0.series == selectedTab.rawValue }
    }

    func load(userId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            // Fetch user's stamps — decode flexibly for bigint/UUID columns
            struct RawUserStamp: Decodable {
                let id: FlexId
                let stamp_id: FlexId
                let issued_at: String?
                let source_type: String?
            }
            let response = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("id, stamp_id, issued_at, source_type")
                .eq("user_id", value: userId)
                .order("issued_at", ascending: false)
                .execute()
            let rawStamps = try JSONDecoder().decode([RawUserStamp].self, from: response.data)

            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let userStamps = rawStamps.map { raw in
                UserStamp(
                    id: raw.id.stringValue,
                    stampId: raw.stamp_id.stringValue,
                    issuedAt: raw.issued_at.flatMap { iso.date(from: $0) },
                    sourceType: raw.source_type
                )
            }

            // Fetch stamp definitions with full display data from DB
            struct StampDefRow: Decodable {
                let id: FlexId
                let slug: String
                let title: String?
                let description: String?
                let rarity: String?
                let series: String?
            }
            let defsResponse = try await SupabaseService.shared.client
                .from("stamps_def")
                .select("id, slug, title, description, rarity, series")
                .execute()
            let stampDefs = try JSONDecoder().decode([StampDefRow].self, from: defsResponse.data)

            // Build definition map keyed by stamp def ID
            let hardcodedMap = Dictionary(
                uniqueKeysWithValues: PassportContent.stampCollection.map { ($0.slug, $0) }
            )
            var defById: [String: StampDefinition] = [:]
            for row in stampDefs {
                // Prefer DB data, fall back to hardcoded for any missing fields
                let hardcoded = hardcodedMap[row.slug]
                let rarity: StampRarity = StampRarity(rawValue: row.rarity ?? "") ?? hardcoded?.rarity ?? .common
                let def = StampDefinition(
                    id: row.id.stringValue,
                    slug: row.slug,
                    title: row.title ?? hardcoded?.title ?? row.slug.replacingOccurrences(of: "_", with: " ").capitalized,
                    description: row.description ?? hardcoded?.description ?? "",
                    rarity: rarity,
                    series: row.series ?? hardcoded?.series ?? "achievement"
                )
                defById[row.id.stringValue] = def
            }

            stamps = userStamps.map { userStamp in
                let def = defById[userStamp.stampId]
                return StampWithDefinition(
                    id: userStamp.id,
                    userStamp: userStamp,
                    definition: def
                )
            }
        } catch {
            errorMessage = error.localizedDescription
            print("[StampsViewModel] Error: \(error)")
        }
    }

    static func crestType(for slug: String) -> Int {
        if slug.contains("first_scan") { return 0 }
        if slug.contains("scan") || slug.contains("milestone") { return 1 }
        if slug.contains("quest") { return 2 }
        if slug.contains("streak") { return 3 }
        if slug.contains("style") || slug.contains("explorer") { return 4 }
        if slug.contains("collection") || slug.contains("master") { return 5 }
        if slug.contains("walk") { return 6 }
        if slug.contains("dawn") { return 7 }
        return 0
    }

    static func rarityIndex(for rarity: StampRarity) -> Int {
        switch rarity {
        case .common: return 0
        case .rare: return 1
        case .epic: return 2
        case .legendary: return 3
        }
    }
}
