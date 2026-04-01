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
        static let stamp = Color(hex: "#DC143C")
        static let list = Color(hex: "#FFC107")
        static let achievement = Color(hex: "#00C853")
        static let walk = Color(hex: "#E65100")
        static let bearer = Color(hex: "#607D8B")
    }

    // MARK: - Archetypes (Designer Republic / Graphic Palette)
    enum archetypes {
        static let classicist     = Color(hex: "#808000") // Olive
        static let romantic       = Color(hex: "#DC143C") // Crimson
        static let stylist        = Color(hex: "#B8860B") // Bronze
        static let modernist      = Color(hex: "#0066FF") // Blue
        static let industrialist  = Color(hex: "#FF8C00") // Orange
        static let visionary      = Color(hex: "#008080") // Teal
        static let popCulturalist = Color(hex: "#FF1493") // Pink
        static let vernacularist  = Color(hex: "#32CD32") // Green
        static let austerist      = Color(hex: "#455A64") // Charcoal
    }

    static func archetypeColor(for name: String) -> Color {
        switch name.lowercased() {
        case "classicist":     return archetypes.classicist
        case "romantic":       return archetypes.romantic
        case "stylist":        return archetypes.stylist
        case "modernist":      return archetypes.modernist
        case "industrialist":  return archetypes.industrialist
        case "visionary":      return archetypes.visionary
        case "pop culturalist", "popculturelist": return archetypes.popCulturalist
        case "vernacularist":  return archetypes.vernacularist
        case "austerist":      return archetypes.austerist
        default:               return accent
        }
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

// MARK: - View Extensions

extension View {
    func tacticalBorder(width: CGFloat, edges: [Edge], color: Color) -> some View {
        overlay(EdgeBorder(width: width, edges: edges).foregroundColor(color))
    }
}

struct EdgeBorder: Shape {
    var width: CGFloat
    var edges: [Edge]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        for edge in edges {
            var x: CGFloat {
                switch edge {
                case .top, .bottom, .leading: return rect.minX
                case .trailing: return rect.maxX - width
                }
            }

            var y: CGFloat {
                switch edge {
                case .top, .leading, .trailing: return rect.minY
                case .bottom: return rect.maxY - width
                }
            }

            var w: CGFloat {
                switch edge {
                case .top, .bottom: return rect.width
                case .leading, .trailing: return width
                }
            }

            var h: CGFloat {
                switch edge {
                case .top, .bottom: return width
                case .leading, .trailing: return rect.height
                }
            }
            path.addRect(CGRect(x: x, y: y, width: w, height: h))
        }
        return path
    }
}
