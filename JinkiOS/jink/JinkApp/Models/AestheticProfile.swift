import Foundation
import SwiftUI

/// 9-archetype aesthetic profile with normalized scores (0.0–1.0)
/// DB stores scores as 0–100; we divide by 100 on decode.
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

    init(classicist: Double, romantic: Double, stylist: Double, modernist: Double,
         industrialist: Double, visionary: Double, popCulturalist: Double,
         vernacularist: Double, austerist: Double) {
        self.classicist = classicist; self.romantic = romantic; self.stylist = stylist
        self.modernist = modernist; self.industrialist = industrialist; self.visionary = visionary
        self.popCulturalist = popCulturalist; self.vernacularist = vernacularist; self.austerist = austerist
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // DB stores 0–100, normalise to 0.0–1.0
        func score(_ key: CodingKeys) throws -> Double {
            let raw = try c.decodeIfPresent(Double.self, forKey: key) ?? 0
            return raw > 1.0 ? raw / 100.0 : raw
        }
        classicist    = try score(.classicist)
        romantic      = try score(.romantic)
        stylist       = try score(.stylist)
        modernist     = try score(.modernist)
        industrialist = try score(.industrialist)
        visionary     = try score(.visionary)
        popCulturalist = try score(.popCulturalist)
        vernacularist = try score(.vernacularist)
        austerist     = try score(.austerist)
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

    /// Neutral default used when no profile data exists yet
    static let `default` = AestheticProfile(
        classicist: 0.15, romantic: 0.10, stylist: 0.12,
        modernist: 0.18, industrialist: 0.12, visionary: 0.14,
        popCulturalist: 0.06, vernacularist: 0.08, austerist: 0.05
    )
}
