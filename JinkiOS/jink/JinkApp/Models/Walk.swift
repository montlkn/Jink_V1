import Foundation
import CoreLocation

struct Walk: Identifiable, Decodable {
    let id: String
    let userId: String
    let routeType: String
    let startedAt: Date
    let completedAt: Date?
    let xpEarned: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case routeType = "route_type"
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case xpEarned = "xp_earned"
    }
}

enum WalkRouteType: String, CaseIterable {
    case aesthetic
    case behavioral
    case wildcard

    var displayName: String {
        switch self {
        case .aesthetic: return "Aesthetic"
        case .behavioral: return "Behavioral"
        case .wildcard: return "Wildcard"
        }
    }

    var description: String {
        switch self {
        case .aesthetic: return "Discover buildings by style"
        case .behavioral: return "Explore by how spaces are used"
        case .wildcard: return "Surprise me"
        }
    }
}

struct WalkSummary: Identifiable, Decodable {
    let id: String
    let routeTier: String?
    let startedAt: Date?
    let endedAt: Date?
    let xpEarned: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case routeTier = "route_tier"
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case xpEarned = "xp_earned"
    }
}
