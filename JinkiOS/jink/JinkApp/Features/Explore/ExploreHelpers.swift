import SwiftUI
import MapKit

// MARK: - Archetype color helper

func archetypeColor(for name: String?) -> Color {
    let lowerName = name?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
    if lowerName.isEmpty { return AppColors.accent }
    
    switch lowerName {
    case "classicist":      return AppColors.archetypes.classicist
    case "romantic":        return AppColors.archetypes.romantic
    case "stylist":         return AppColors.archetypes.stylist
    case "modernist":       return AppColors.archetypes.modernist
    case "industrialist":   return AppColors.archetypes.industrialist
    case "visionary":       return AppColors.archetypes.visionary
    case "pop culturalist": return AppColors.archetypes.popCulturalist
    case "vernacularist":   return AppColors.archetypes.vernacularist
    case "austerist":       return AppColors.archetypes.austerist
    default:
        // Priority 1: Vernacularist (Neighborly, Local, Colonial, Revival)
        if lowerName.contains("vernacular") || lowerName.contains("local") || lowerName.contains("rooted") || lowerName.contains("colonial") || lowerName.contains("revival") || lowerName.contains("neighborhood") || lowerName.contains("garden") {
            return AppColors.archetypes.vernacularist
        }
        // Priority 2: Classicist
        if lowerName.contains("classic") || lowerName.contains("renaissance") || lowerName.contains("beaux") || lowerName.contains("greek") {
            return AppColors.archetypes.classicist
        }
        // Priority 3: Modernist / Austerist
        if lowerName.contains("modern") || lowerName.contains("international") { return AppColors.archetypes.modernist }
        if lowerName.contains("brutalist") || lowerName.contains("austerist") || lowerName.contains("minimal") { return AppColors.archetypes.austerist }
        
        // Priority 4: Romantic
        if lowerName.contains("gothic") || lowerName.contains("tudor") || lowerName.contains("romantic") || lowerName.contains("queen anne") {
            return AppColors.archetypes.romantic
        }
        // Priority 5: Stylist
        if lowerName.contains("deco") || lowerName.contains("nouveau") || lowerName.contains("stylist") {
            return AppColors.archetypes.stylist
        }
        // Priority 6: Industrialist
        if lowerName.contains("industrial") || lowerName.contains("factory") || lowerName.contains("warehouse") {
            return AppColors.archetypes.industrialist
        }
        
        return AppColors.accent
    }
}

// MARK: - MapItem

enum MapItem: Identifiable {
    case single(Building)
    case cluster(count: Int, coordinate: CLLocationCoordinate2D, dominantAesthetic: String?)

    var id: String {
        switch self {
        case .single(let b):
            return "s_\(b.bin)"
        case .cluster(let n, let c, _):
            return "c_\(n)_\(String(format: "%.4f", c.latitude))_\(String(format: "%.4f", c.longitude))"
        }
    }

    var coordinate: CLLocationCoordinate2D {
        switch self {
        case .single(let b):
            return CLLocationCoordinate2D(latitude: b.latitude ?? 0, longitude: b.longitude ?? 0)
        case .cluster(_, let c, _):
            return c
        }
    }
}

// MARK: - Clustering

func computeMapItems(buildings: [Building], span: MKCoordinateSpan) -> [MapItem] {
    let threshold = clusterThreshold(for: span)
    guard threshold > 0 else { return buildings.map { .single($0) } }

    var assigned = [Bool](repeating: false, count: buildings.count)
    var items: [MapItem] = []

    for i in 0..<buildings.count {
        guard !assigned[i] else { continue }
        guard let iLat = buildings[i].latitude, let iLng = buildings[i].longitude else {
            assigned[i] = true; continue
        }
        var group = [buildings[i]]
        assigned[i] = true

        for j in (i + 1)..<buildings.count {
            guard !assigned[j],
                  let jLat = buildings[j].latitude,
                  let jLng = buildings[j].longitude else { continue }
            if sqrt(pow(iLat - jLat, 2) + pow(iLng - jLng, 2)) <= threshold {
                group.append(buildings[j])
                assigned[j] = true
            }
        }

        if group.count == 1 {
            items.append(.single(group[0]))
        } else {
            let lat = group.compactMap(\.latitude).reduce(0, +) / Double(group.count)
            let lng = group.compactMap(\.longitude).reduce(0, +) / Double(group.count)
            let aesthetics = group.compactMap { b -> String? in
                b.aestheticProfile?.dominant?.name.lowercased() ?? b.primaryAesthetic?.lowercased() ?? b.style?.lowercased()
            }
            let counts = aesthetics.reduce(into: [String: Int]()) { $0[$1, default: 0] += 1 }
            items.append(.cluster(count: group.count,
                                   coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                   dominantAesthetic: counts.max(by: { $0.value < $1.value })?.key))
        }
    }
    return items
}

private func clusterThreshold(for span: MKCoordinateSpan) -> Double {
    switch span.latitudeDelta {
    case ..<0.001: return 0        // tight zoom
    case ..<0.003: return 0.0002
    case ..<0.005: return 0.0005
    case ..<0.01:  return 0.001
    case ..<0.02:  return 0.002
    default:       return 0.008
    }
}
