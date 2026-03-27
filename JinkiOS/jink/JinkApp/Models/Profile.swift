import Foundation

struct Profile: Decodable, Identifiable {
    let id: String
    let username: String?
    let totalXp: Int
    let level: Int
    let levelTitle: String?
    let levelTier: String?
    let streakCount: Int
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, username, level
        case totalXp = "total_xp"
        case levelTitle = "level_title"
        case levelTier = "level_tier"
        case streakCount = "daily_streak_count"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        username = try c.decodeIfPresent(String.self, forKey: .username)
        totalXp = try c.decodeIfPresent(Int.self, forKey: .totalXp) ?? 0
        level = max(1, try c.decodeIfPresent(Int.self, forKey: .level) ?? 1)
        levelTitle = try c.decodeIfPresent(String.self, forKey: .levelTitle)
        levelTier = try c.decodeIfPresent(String.self, forKey: .levelTier)
        streakCount = try c.decodeIfPresent(Int.self, forKey: .streakCount) ?? 0
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt)
    }

    init(id: String, username: String?, totalXp: Int, level: Int, levelTitle: String?,
         levelTier: String?, dailyStreakCount: Int, createdAt: Date? = nil) {
        self.id = id
        self.username = username
        self.totalXp = totalXp
        self.level = max(1, level)
        self.levelTitle = levelTitle
        self.levelTier = levelTier
        self.streakCount = dailyStreakCount
        self.createdAt = createdAt
    }
}

struct ScannedBuilding: Identifiable {
    let id = UUID()
    let bin: String
    let name: String?
    let address: String?
    let photoUrl: String?
    let scannedAt: Date?
    let style: String?
    let yearBuilt: String?
    let architect: String?

    var displayName: String {
        if let n = name, !n.isEmpty, n != "0" { return n }
        if let a = address, !a.isEmpty { return a }
        return "Unknown Building"
    }
}
