import Foundation
import SwiftUI

/// 9-archetype aesthetic profile with normalized scores (0.0–1.0)
struct AestheticProfile: Codable {
    var classicist: Double
    var romantic: Double
    var stylist: Double
    var modernist: Double
    var industrialist: Double
    var visionary: Double
    var popCulturalist: Double
    var vernacularist: Double
    var austerist: Double

    enum CodingKeys: String, CodingKey {
        case classicist, romantic, stylist, modernist
        case industrialist, visionary
        case popCulturalist = "pop_culturalist"
        case vernacularist, austerist
    }

    /// All archetypes as ordered (name, score, color) tuples
    var all: [(name: String, score: Double, color: Color)] {
        [
            ("Classicist",     classicist,     AppColors.archetypes.classicist),
            ("Romantic",       romantic,        AppColors.archetypes.romantic),
            ("Stylist",        stylist,         AppColors.archetypes.stylist),
            ("Modernist",      modernist,       AppColors.archetypes.modernist),
            ("Industrialist",  industrialist,   AppColors.archetypes.industrialist),
            ("Visionary",      visionary,       AppColors.archetypes.visionary),
            ("Pop Culturalist",popCulturalist,  AppColors.archetypes.popCulturalist),
            ("Vernacularist",  vernacularist,   AppColors.archetypes.vernacularist),
            ("Austerist",      austerist,       AppColors.archetypes.austerist),
        ]
    }

    /// Dominant archetype by score
    var dominant: (name: String, score: Double, color: Color)? {
        all.max(by: { $0.score < $1.score })
    }
}
