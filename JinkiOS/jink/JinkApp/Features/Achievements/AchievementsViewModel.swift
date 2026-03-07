import Foundation
import Supabase

struct UserAchievement: Decodable {
    let achievementId: String
    let earnedAt: Date?

    enum CodingKeys: String, CodingKey {
        case achievementId = "achievement_id"
        case earnedAt = "earned_at"
    }
}

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
            let userAchievements: [UserAchievement] = try await SupabaseService.shared.client
                .from("user_achievements")
                .select("achievement_id, earned_at")
                .eq("user_id", value: userId)
                .execute()
                .value

            let unlockedMap = Dictionary(
                uniqueKeysWithValues: userAchievements.map { ($0.achievementId, $0.earnedAt) }
            )

            achievements = PassportContent.achievementLedger.map { def in
                AchievementWithStatus(
                    id: def.id,
                    definition: def,
                    isUnlocked: unlockedMap[def.id] != nil,
                    earnedAt: unlockedMap[def.id] ?? nil
                )
            }
        } catch {
            errorMessage = error.localizedDescription
            print("[AchievementsViewModel] Error: \(error)")
            // Still show definitions as locked on error
            achievements = PassportContent.achievementLedger.map { def in
                AchievementWithStatus(id: def.id, definition: def, isUnlocked: false, earnedAt: nil)
            }
        }
    }
}
