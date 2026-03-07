import ActivityKit
import SwiftUI

// MARK: - WalkActivityState

struct WalkActivityState: Codable, Hashable {
    let buildingName: String
    let distanceString: String   // "234 ft"
    let etaString: String        // "4 min"
    let bearingToBuilding: Double
    let userHeading: Double
    let verifiedCount: Int
    let walkXP: Int
}

// MARK: - WalkActivityAttributes

struct WalkActivityAttributes: ActivityAttributes {
    typealias ContentState = WalkActivityState

    let walkId: String
    let totalBuildings: Int
}

// MARK: - Dynamic Island Widget Views

extension WalkActivityAttributes {

    // 8-directional arrow SF Symbol based on relative bearing
    static func bearingSymbol(bearing: Double, heading: Double) -> String {
        var rel = bearing - heading
        while rel < 0 { rel += 360 }
        while rel >= 360 { rel -= 360 }
        switch rel {
        case 337.5...360, 0..<22.5: return "arrow.up"
        case 22.5..<67.5:           return "arrow.up.right"
        case 67.5..<112.5:          return "arrow.right"
        case 112.5..<157.5:         return "arrow.down.right"
        case 157.5..<202.5:         return "arrow.down"
        case 202.5..<247.5:         return "arrow.down.left"
        case 247.5..<292.5:         return "arrow.left"
        case 292.5..<337.5:         return "arrow.up.left"
        default:                    return "arrow.up"
        }
    }
}
