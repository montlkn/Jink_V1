import Foundation

struct Profile: Decodable, Identifiable {
    let id: String
    let username: String?
    let xp: Int
    let level: Int
    let levelTitle: String?
    let levelTier: String?
    let streakCount: Int   // daily_streak_count in DB
    let stamps: [String]
    // Note: created_at does not exist on profiles table; issue date omitted

    enum CodingKeys: String, CodingKey {
        case id, username, xp, level, stamps
        case levelTitle = "level_title"
        case levelTier = "level_tier"
        case streakCount = "daily_streak_count"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        username = try c.decodeIfPresent(String.self, forKey: .username)
        xp = try c.decodeIfPresent(Int.self, forKey: .xp) ?? 0
        level = max(1, try c.decodeIfPresent(Int.self, forKey: .level) ?? 1)
        levelTitle = try c.decodeIfPresent(String.self, forKey: .levelTitle)
        levelTier = try c.decodeIfPresent(String.self, forKey: .levelTier)
        streakCount = try c.decodeIfPresent(Int.self, forKey: .streakCount) ?? 0
        stamps = try c.decodeIfPresent([String].self, forKey: .stamps) ?? []
    }
}
