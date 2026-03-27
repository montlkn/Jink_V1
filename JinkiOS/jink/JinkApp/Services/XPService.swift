import Foundation
import Supabase

struct XPSummary {
    let xp: Int
    let level: Int
    let levelTitle: String?
    let levelTier: String?
}

final class XPService {
    static let shared = XPService()
    private init() {}

    func awardXP(userId: String, amount: Int) async throws {
        // XP is tracked via user_achievements.total_xp, updated by ProgressService.incrementScanCount
        // This is a no-op to avoid double-counting
    }

    func fetchXPSummary(userId: String) async throws -> XPSummary {
        struct AchRow: Decodable {
            let total_xp: Int?
        }
        let rows: [AchRow] = try await SupabaseService.shared.client
            .from("user_achievements")
            .select("total_xp")
            .eq("user_id", value: userId)
            .execute()
            .value
        let xp = rows.first?.total_xp ?? 0
        return XPSummary(xp: xp, level: max(1, xp / 100), levelTitle: nil, levelTier: nil)
    }
}
