import SwiftUI

enum AppColors {
    // MARK: - Brand
    static let accent = Color(hex: "#00AEEF")
    static let daily = Color(hex: "#FF4400")
    static let success = Color(hex: "#76B900")
    static let warning = Color(hex: "#FF4400")
    static let error = Color(hex: "#FF0000")
    static let info = Color(hex: "#00AEEF")

    // MARK: - Text
    static let text = Color.primary
    static let textSecondary = Color.secondary

    // MARK: - Passport
    enum passport {
        static let streak = Color(hex: "#F50057")
        static let visa = Color(hex: "#7B1FA2")
        static let stamp = Color(hex: "#DC143C")
        static let list = Color(hex: "#FFC107")
        static let achievement = Color(hex: "#00C853")
        static let walk = Color(hex: "#E65100")
        static let bearer = Color(hex: "#607D8B")
    }

    // MARK: - Archetypes
    enum archetypes {
        static let classicist    = Color(hex: "#C9C8A6")
        static let romantic      = Color(hex: "#DC143C")
        static let stylist       = Color(hex: "#FFD700")
        static let modernist     = Color(hex: "#0066FF")
        static let industrialist = Color(hex: "#FF8C00")
        static let visionary     = Color(hex: "#00FFFF")
        static let popCulturalist = Color(hex: "#FF1493")
        static let vernacularist = Color(hex: "#32CD32")
        static let austerist     = Color(hex: "#95A5A6")
    }
}

// MARK: - Color Hex Init
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 6:
            (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255
        )
    }
}
