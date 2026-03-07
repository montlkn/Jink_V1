import Foundation
import Supabase

struct AwardXPParams: Encodable, Sendable {
    let pUserId: String
    let pAmount: Int

    enum CodingKeys: String, CodingKey {
        case pUserId = "p_user_id"
        case pAmount = "p_amount"
    }
}

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
        let params = AwardXPParams(pUserId: userId, pAmount: amount)
        try await SupabaseService.shared.client
            .rpc("award_xp", params: params)
            .execute()
    }

    func fetchXPSummary(userId: String) async throws -> XPSummary {
        struct ProfileRow: Decodable {
            let xp: Int?
            let level: Int?
            let levelTitle: String?
            let levelTier: String?

            enum CodingKeys: String, CodingKey {
                case xp, level
                case levelTitle = "level_title"
                case levelTier = "level_tier"
            }
        }

        let row: ProfileRow = try await SupabaseService.shared.client
            .from("profiles")
            .select("xp, level, level_title, level_tier")
            .eq("id", value: userId)
            .single()
            .execute()
            .value

        return XPSummary(
            xp: row.xp ?? 0,
            level: max(1, row.level ?? 1),
            levelTitle: row.levelTitle,
            levelTier: row.levelTier
        )
    }
}
