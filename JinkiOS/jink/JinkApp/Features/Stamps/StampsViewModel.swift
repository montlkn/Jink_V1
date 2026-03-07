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

struct UserStamp: Identifiable, Decodable {
    let id: String
    let stampSlug: String
    let earnedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case stampSlug = "stamp_slug"
        case earnedAt = "earned_at"
    }
}

struct StampWithDefinition: Identifiable {
    let id: String
    let userStamp: UserStamp
    let definition: StampDefinition?

    var title: String { definition?.title ?? stampSlug }
    var description: String { definition?.description ?? "" }
    var rarity: StampRarity { definition?.rarity ?? .common }
    var series: String { definition?.series ?? "building" }
    var stampSlug: String { userStamp.stampSlug }
    var earnedAt: Date? { userStamp.earnedAt }
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
            let userStamps: [UserStamp] = try await SupabaseService.shared.client
                .from("user_stamps")
                .select("id, stamp_slug, earned_at")
                .eq("user_id", value: userId)
                .order("earned_at", ascending: false)
                .execute()
                .value

            let definitionMap = Dictionary(
                uniqueKeysWithValues: PassportContent.stampCollection.map { ($0.slug, $0) }
            )

            stamps = userStamps.map { userStamp in
                StampWithDefinition(
                    id: userStamp.id,
                    userStamp: userStamp,
                    definition: definitionMap[userStamp.stampSlug]
                )
            }
        } catch {
            errorMessage = error.localizedDescription
            print("[StampsViewModel] Error: \(error)")
        }
    }
}
