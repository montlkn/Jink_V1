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

    enum CodingKeys: String, CodingKey, CaseIterable {
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
        var rawDict: [String: Double] = [:]

        if let c = try? decoder.singleValueContainer(),
           let jsonStr = try? c.decode(String.self),
           let data = jsonStr.data(using: .utf8),
           let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            
            for (key, value) in dict {
                if let d = value as? Double {
                    rawDict[key] = d
                } else if let s = value as? String, let d = Double(s) {
                    rawDict[key] = d
                }
            }
        } else {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            for key in CodingKeys.allCases {
                if let d = try? c.decodeIfPresent(Double.self, forKey: key) {
                    rawDict[key.stringValue] = d
                } else if let s = try? c.decodeIfPresent(String.self, forKey: key), let d = Double(s) {
                    rawDict[key.stringValue] = d
                }
            }
        }

        // Sum and normalize safely to relative proportions (0.0 - 1.0)
        let sum = rawDict.values.reduce(0, +)
        let factor = sum > 0 ? (sum > 1.0 ? sum : 1.0) : 1.0
        
        func get(_ key: String) -> Double {
            let val = rawDict[key] ?? 0.0
            return sum > 1.0 ? val / factor : val
        }
        
        classicist = get(CodingKeys.classicist.stringValue)
        romantic = get(CodingKeys.romantic.stringValue)
        stylist = get(CodingKeys.stylist.stringValue)
        modernist = get(CodingKeys.modernist.stringValue)
        industrialist = get(CodingKeys.industrialist.stringValue)
        visionary = get(CodingKeys.visionary.stringValue)
        popCulturalist = get(CodingKeys.popCulturalist.stringValue)
        vernacularist = get(CodingKeys.vernacularist.stringValue)
        austerist = get(CodingKeys.austerist.stringValue)
    }

    /// All archetypes as ordered (name, score, color, bio) tuples
    var all: [(name: String, score: Double, color: Color, bio: String)] {
        [
            ("Classicist", classicist, AppColors.archetypes.classicist,
             "Drawn to the eternal laws of proportion and symmetry. You find beauty in the permanence of stone, the order of columns, and the gravity of monumental history."),
            ("Romantic", romantic, AppColors.archetypes.romantic,
             "An advocate for the soul of a space. You prefer the atmospheric, the overgrown, and the poetic—places that feel lived-in and heavy with untold stories."),
            ("Stylist", stylist, AppColors.archetypes.stylist,
             "A curator of elegance and craft. You appreciate the decorative detail, the polished finish, and the deliberate flair that transforms a building into a masterpiece."),
            ("Modernist", modernist, AppColors.archetypes.modernist,
             "A purist of form and function. You seek the clarity of glass, the honesty of concrete, and the light-filled efficiency of the machine for living."),
            ("Industrialist", industrialist, AppColors.archetypes.industrialist,
             "Respecting the raw and the structural. You find aesthetic power in exposed steel, visible systems, and the unadorned utility of the urban factory."),
            ("Visionary", visionary, AppColors.archetypes.visionary,
             "Forever looking at the horizon of the future. You are captivated by bold geometry, speculative materials, and structures that defy current reality."),
            ("Pop Culturalist", popCulturalist, AppColors.archetypes.popCulturalist,
             "Celebrating the vibrant and the immediate. You embrace the neon, the playful, and the architectural icons that define our shared media and collective memory."),
            ("Vernacularist", vernacularist, AppColors.archetypes.vernacularist,
             "Deeply rooted in the local and the everyday. You prefer the honest charm of regional materials and the wisdom of buildings designed for their specific terrain."),
            ("Austerist", austerist, AppColors.archetypes.austerist,
             "A seeker of silence and essential truth. You gravitate toward the minimal, the monochromatic, and the profound power of empty space.")
        ]
    }

    /// Dominant archetype by score
    var dominant: (name: String, score: Double, color: Color, bio: String)? {
        all.max(by: { $0.score < $1.score })
    }

    /// Neutral default used when no profile data exists yet
    static let `default` = AestheticProfile(
        classicist: 0.15, romantic: 0.10, stylist: 0.12,
        modernist: 0.18, industrialist: 0.12, visionary: 0.14,
        popCulturalist: 0.06, vernacularist: 0.08, austerist: 0.05
    )
}
