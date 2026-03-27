import Foundation
import Supabase

struct AchievementWithStatus: Identifiable {
    let id: String
    let definition: AchievementDefinition
    let isUnlocked: Bool
    let earnedAt: Date?
}

@Observable
final class AchievementsViewModel {
    var achievements: [AchievementWithStatus] = []
    var isLoading = false
    var errorMessage: String? = nil

    func load(userId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            // Fetch all achievement definitions from DB
            // id may be UUID or bigint — decode flexibly
            struct AchDef: Decodable {
                let id: FlexId
                let slug: String
                let title: String
                let description: String?
                let xp_reward: Int
            }
            let defsResponse = try await SupabaseService.shared.client
                .from("achievements_def")
                .select("id, slug, title, description, xp_reward")
                .execute()
            let defs = try JSONDecoder().decode([AchDef].self, from: defsResponse.data)

            // Fetch user's awarded achievements
            struct UserAch: Decodable {
                let achievement_id: FlexId
            }
            let awardedResponse = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("achievement_id")
                .eq("user_id", value: userId)
                .execute()
            let awarded = try JSONDecoder().decode([UserAch].self, from: awardedResponse.data)

            let awardedSet = Set(awarded.map { $0.achievement_id.stringValue })

            // Map client-side definitions by slug for icons etc.
            let clientDefs = Dictionary(uniqueKeysWithValues: PassportContent.achievementLedger.map { ($0.id, $0) })

            achievements = defs.map { def in
                let clientDef = clientDefs[def.slug]
                let definition = AchievementDefinition(
                    id: def.slug,
                    title: def.title,
                    description: def.description ?? "",
                    xpReward: def.xp_reward,
                    icon: clientDef?.icon ?? "star.fill",
                    isMissable: clientDef?.isMissable ?? false,
                    verificationText: clientDef?.verificationText
                )
                return AchievementWithStatus(
                    id: def.id.stringValue,
                    definition: definition,
                    isUnlocked: awardedSet.contains(def.id.stringValue),
                    earnedAt: nil // simplified — date not critical for display
                )
            }.sorted { a, b in
                if a.isUnlocked != b.isUnlocked { return a.isUnlocked }
                return a.definition.title < b.definition.title
            }

            print("[AchievementsViewModel] Loaded \(defs.count) defs, \(awarded.count) awarded")
        } catch {
            errorMessage = error.localizedDescription
            print("[AchievementsViewModel] Error: \(error)")
        }
    }
}

/// Flexible ID that decodes both Int and String from JSON
enum FlexId: Decodable, Hashable {
    case int(Int)
    case string(String)
    var stringValue: String {
        switch self {
        case .int(let v): return String(v)
        case .string(let v): return v
        }
    }
    var jsonValue: AnyJSON {
        switch self {
        case .int(let v): return .integer(v)
        case .string(let v): return .string(v)
        }
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let i = try? c.decode(Int.self) { self = .int(i) }
        else { self = .string(try c.decode(String.self)) }
    }
}
