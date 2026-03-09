import Auth
import SwiftUI
import MapKit

// MARK: - Archetype color helper

func archetypeColor(for name: String?) -> Color {
    switch name?.lowercased() {
    case "classicist":      return AppColors.archetypes.classicist
    case "romantic":        return AppColors.archetypes.romantic
    case "stylist":         return AppColors.archetypes.stylist
    case "modernist":       return AppColors.archetypes.modernist
    case "industrialist":   return AppColors.archetypes.industrialist
    case "visionary":       return AppColors.archetypes.visionary
    case "pop culturalist": return AppColors.archetypes.popCulturalist
    case "vernacularist":   return AppColors.archetypes.vernacularist
    case "austerist":       return AppColors.archetypes.austerist
    default:                return AppColors.accent
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

private func clusterThreshold(for span: MKCoordinateSpan) -> Double {
    switch span.latitudeDelta {
    case ..<0.001: return 0        // very tight zoom — show all pins
    case ..<0.003: return 0.0002   // street level — merge same-building entries
    case ..<0.005: return 0.0005
    case ..<0.01:  return 0.001
    case ..<0.02:  return 0.002
    case ..<0.05:  return 0.004
    default:       return 0.008
    }
}

private func computeMapItems(buildings: [Building], span: MKCoordinateSpan) -> [MapItem] {
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
            let counts = group.compactMap(\.primaryAesthetic).reduce(into: [String: Int]()) { $0[$1, default: 0] += 1 }
            items.append(.cluster(count: group.count,
                                   coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                   dominantAesthetic: counts.max(by: { $0.value < $1.value })?.key))
        }
    }
    return items
}

// MARK: - ExploreView

struct ExploreView: View {
    @Environment(LocationService.self) private var locationService
    @Environment(AppState.self) private var appState
    @State private var vm = ExploreViewModel()
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840),
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )
    // Track where we last loaded so we know when the map has drifted far enough
    @State private var lastLoadCenter: CLLocationCoordinate2D? = nil
    @State private var showSearchHere = false
    @State private var searchText = ""

    private var mapItems: [MapItem] {
        let buildings = vm.buildings
            .filter { $0.latitude != nil && $0.longitude != nil }
        return computeMapItems(buildings: buildings, span: region.span)
    }

    var body: some View {
        ZStack(alignment: .top) {
            Map(coordinateRegion: $region, showsUserLocation: true, annotationItems: mapItems) { item in
                MapAnnotation(coordinate: item.coordinate) {
                    switch item {
                    case .single(let building):
                        BuildingCallout(
                            building: building,
                            isSelected: vm.selectedBuilding?.bin == building.bin
                        )
                        .onTapGesture { vm.selectedBuilding = building }

                    case .cluster(let count, _, let dominant):
                        ClusterPin(count: count, dominantAesthetic: dominant)
                            .onTapGesture {
                                withAnimation {
                                    region.center = item.coordinate
                                    region.span = MKCoordinateSpan(
                                        latitudeDelta: region.span.latitudeDelta * 0.4,
                                        longitudeDelta: region.span.longitudeDelta * 0.4
                                    )
                                }
                            }
                    }
                }
            }
            .ignoresSafeArea(edges: .top)
            .onChange(of: region.center.latitude) { _, _ in updateSearchHereVisibility() }
            .onChange(of: region.center.longitude) { _, _ in updateSearchHereVisibility() }

            // Top Content (Search Bar & Actions)
            VStack(spacing: 12) {
                // Search Bar
                ExploreSearchBar(searchText: $searchText) {
                    guard !searchText.isEmpty else { return }
                    Task {
                        await vm.search(query: searchText)
                        if let first = vm.buildings.first, let lat = first.latitude, let lng = first.longitude {
                            withAnimation {
                                region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                                region.span = MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                            }
                        }
                    }
                }
                .padding(.top, 60) // status bar height
                
                // Top bar — search pill (centre) + Done button (right)
                HStack(spacing: 12) {
                    Spacer()
                    Button {
                        guard !vm.isLoading else { return }
                        Task {
                            showSearchHere = false
                            let coord = region.center
                            lastLoadCenter = coord
                            let userId = appState.currentUser?.id.uuidString
                            await vm.load(near: coord, userId: userId)
                        }
                    } label: {
                        HStack(spacing: 6) {
                            if vm.isLoading {
                                ProgressView().scaleEffect(0.7).tint(.primary)
                                Text("Searching…")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(.primary)
                            } else if showSearchHere {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 12, weight: .semibold))
                                Text("Search this area")
                                    .font(.system(size: 14, weight: .semibold))
                            } else {
                                Image(systemName: "map")
                                    .font(.system(size: 12, weight: .semibold))
                                Text("Explore")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                        }
                        .foregroundStyle(showSearchHere ? .white : .primary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(
                            showSearchHere
                                ? AnyShapeStyle(AppColors.accent)
                                : AnyShapeStyle(.regularMaterial),
                            in: Capsule()
                        )
                        .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 2)
                        .animation(.easeInOut(duration: 0.2), value: showSearchHere)
                        .animation(.easeInOut(duration: 0.2), value: vm.isLoading)
                    }
                    Spacer()
                    DismissButton()
                }
                .padding(.horizontal, 16)
            }
            VStack {
                Spacer()
                HStack(alignment: .bottom) {
                    ArchetypeLegend()
                    Spacer()
                    VStack(alignment: .trailing, spacing: 12) {
                        Button {
                            let coord = locationService.location?.coordinate
                                ?? CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840)
                            withAnimation { region.center = coord }
                        } label: {
                            Image(systemName: "location.fill")
                                .font(.title3)
                                .foregroundStyle(.white)
                                .frame(width: 48, height: 48)
                                .background(AppColors.accent, in: Circle())
                                .shadow(color: AppColors.accent.opacity(0.4), radius: 8, x: 0, y: 4)
                        }
                    }
                }
                .padding(.bottom, 20)
                .padding(.horizontal, 16)
            }
        }
        .sheet(item: $vm.selectedBuilding) { building in
            BuildingDetailSheet(building: building, vm: vm)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .navigationBarHidden(true)
        .task {
            let coord = locationService.location?.coordinate
                ?? CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840)
            withAnimation { region.center = coord }
            lastLoadCenter = coord
            let userId = appState.currentUser?.id.uuidString
            await vm.load(near: coord, userId: userId)
        }
    }

    private func updateSearchHereVisibility() {
        guard let last = lastLoadCenter else { return }
        let current = CLLocation(latitude: region.center.latitude, longitude: region.center.longitude)
        let loaded = CLLocation(latitude: last.latitude, longitude: last.longitude)
        let drifted = current.distance(from: loaded) > 300
        if drifted && !showSearchHere {
            withAnimation { showSearchHere = true }
        } else if !drifted && showSearchHere {
            withAnimation { showSearchHere = false }
        }
    }
}

// MARK: - Dismiss Button

private struct DismissButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button { dismiss() } label: {
            Text("Done")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.primary)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.regularMaterial, in: Capsule())
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

// MARK: - Cluster Pin

private struct ClusterPin: View {
    let count: Int
    let dominantAesthetic: String?
    private var color: Color { archetypeColor(for: dominantAesthetic) }

    var body: some View {
        ZStack {
            Circle()
                .fill(color)
                .frame(width: 32, height: 32)
                .overlay(Circle().stroke(.white, lineWidth: 1.5))
                .shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 2)
            Text("\(count)")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Building callout pill

private struct BuildingCallout: View {
    let building: Building
    let isSelected: Bool

    private var color: Color { archetypeColor(for: building.primaryAesthetic) }
    private var label: String { building.address ?? building.name ?? "Building" }

    var body: some View {
        VStack(spacing: 0) {
            Text(label)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .frame(maxWidth: 130)
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(color)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(.white, lineWidth: isSelected ? 1.5 : 0))
                .scaleEffect(isSelected ? 1.08 : 1.0)
            Triangle().fill(color).frame(width: 8, height: 6)
        }
        .shadow(color: .black.opacity(0.25), radius: 2, x: 0, y: 1)
        .animation(.easeOut(duration: 0.15), value: isSelected)
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: rect.midX, y: rect.maxY))
            p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            p.closeSubpath()
        }
    }
}

// MARK: - Archetype Legend

private struct ArchetypeLegend: View {
    @State private var expanded = false

    private let entries: [(name: String, color: Color)] = [
        ("Classicist",      AppColors.archetypes.classicist),
        ("Romantic",        AppColors.archetypes.romantic),
        ("Stylist",         AppColors.archetypes.stylist),
        ("Modernist",       AppColors.archetypes.modernist),
        ("Industrialist",   AppColors.archetypes.industrialist),
        ("Visionary",       AppColors.archetypes.visionary),
        ("Pop Culturalist", AppColors.archetypes.popCulturalist),
        ("Vernacularist",   AppColors.archetypes.vernacularist),
        ("Austerist",       AppColors.archetypes.austerist),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if expanded {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(entries, id: \.name) { entry in
                        HStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 2).fill(entry.color).frame(width: 12, height: 12)
                            Text(entry.name).font(.system(size: 10, weight: .medium)).foregroundStyle(.primary)
                        }
                    }
                }
                .padding(10)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
                .padding(.bottom, 6)
            }
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "square.grid.2x2.fill").font(.caption2)
                    Text(expanded ? "Hide Legend" : "Legend").font(.caption.bold())
                }
                .foregroundStyle(.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(.regularMaterial, in: Capsule())
            }
        }
    }
}

// MARK: - Building Detail Sheet

private struct BuildingDetailSheet: View {
    let building: Building
    let vm: ExploreViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var aiOneLiner: String? = nil
    @State private var loadingOneLiner = false

    private var score: Double { vm.matchScore(for: building) }
    private var accentColor: Color { archetypeColor(for: building.primaryAesthetic) }

    private var displayName: String {
        if let name = building.name, !name.isEmpty, !name.hasPrefix("Court Name:"), name != "0" {
            return name
        }
        return building.address ?? "Unknown Building"
    }

    private var showAddressLine: Bool {
        guard let name = building.name, !name.isEmpty, !name.hasPrefix("Court Name:"), name != "0"
        else { return false }
        return building.address != nil
    }

    private var cleanYear: String? {
        guard let raw = building.yearBuilt, !raw.isEmpty, raw != "0" else { return nil }
        if let d = Double(raw), d > 1000 { return String(Int(d)) }
        return raw
    }

    private var cleanDescription: String? {
        guard let d = building.description, !d.isEmpty, Double(d) == nil else { return nil }
        return d
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {

                // ── Header ──────────────────────────────────────────
                HStack(alignment: .center) {
                    HStack(spacing: 6) {
                        Circle().fill(accentColor).frame(width: 8, height: 8)
                        Text((building.primaryAesthetic ?? "Building").uppercased())
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(accentColor)
                    }
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.secondary)
                            .frame(width: 26, height: 26)
                            .background(Color(.systemGray5), in: Circle())
                    }
                }

                // ── Title ────────────────────────────────────────────
                VStack(alignment: .leading, spacing: 4) {
                    Text(displayName)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.primary)
                        .fixedSize(horizontal: false, vertical: true)

                    if showAddressLine, let address = building.address {
                        Text(address)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // ── Meta grid ────────────────────────────────────────
                // Each row: label on left, value on right — full width, nothing truncates
                VStack(spacing: 0) {
                    if let year = cleanYear {
                        MetaRow(label: "BUILT", value: year)
                        Divider().opacity(0.2)
                    }
                    if let arch = building.architect, !arch.isEmpty {
                        MetaRow(label: "ARCHITECT", value: arch)
                        Divider().opacity(0.2)
                    }
                    if let style = building.style ?? building.secondaryAesthetic, !style.isEmpty {
                        MetaRow(label: "STYLE", value: style)
                        Divider().opacity(0.2)
                    }
                    if let mat = building.materials, !mat.isEmpty {
                        MetaRow(label: "MATERIALS", value: mat)
                    }
                }
                .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 12))

                // ── Description / AI one-liner ───────────────────────
                if let line = aiOneLiner {
                    Text(line)
                        .font(.body)
                        .foregroundStyle(.primary.opacity(0.8))
                        .fixedSize(horizontal: false, vertical: true)
                } else if let desc = cleanDescription {
                    Text(desc)
                        .font(.body)
                        .foregroundStyle(.primary.opacity(0.8))
                        .fixedSize(horizontal: false, vertical: true)
                } else if loadingOneLiner {
                    HStack(spacing: 8) {
                        ProgressView().scaleEffect(0.75)
                        Text("Analysing the architecture…")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // ── Match score ──────────────────────────────────────
                if !vm.userAestheticVector.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("MATCH SCORE")
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundStyle(accentColor)
                            Spacer()
                            Text("\(Int(score * 100))%")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(accentColor)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3).fill(Color(.systemGray5)).frame(height: 5)
                                RoundedRectangle(cornerRadius: 3).fill(accentColor)
                                    .frame(width: geo.size.width * score, height: 5)
                            }
                        }
                        .frame(height: 5)
                        if !topArchetypeNames.isEmpty {
                            Text("Matches your \(topArchetypeNames) taste")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // ── Directions ───────────────────────────────────────
                if let lat = building.latitude, let lng = building.longitude {
                    Button {
                        if let url = URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=w") {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        Label("Walking Directions", systemImage: "arrow.triangle.turn.up.right.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(accentColor, in: RoundedRectangle(cornerRadius: 14))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(22)
            .padding(.bottom, 10)
        }
        .task(id: building.bin) {
            guard cleanDescription == nil else { return }
            loadingOneLiner = true
            aiOneLiner = await GeminiOneLiner.fetch(for: building)
            loadingOneLiner = false
        }
    }

    private var topArchetypeNames: String {
        vm.userAestheticVector
            .sorted { $0.value > $1.value }
            .prefix(2).map { $0.key.capitalized }
            .joined(separator: " & ")
    }
}

// MARK: - Meta Row (full-width, no truncation)

private struct MetaRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

// MARK: - Gemini one-liner

private enum GeminiOneLiner {
    static func fetch(for building: Building) async -> String? {
        let parts: [String] = [
            building.address.map { "Address: \($0)" },
            building.yearBuilt.flatMap { y -> String? in
                guard let d = Double(y), d > 1000 else { return nil }
                return "Built: \(Int(d))"
            },
            building.architect.map { "Architect: \($0)" },
            building.style.map { "Style: \($0)" },
            building.primaryAesthetic.map { "Aesthetic: \($0)" },
            building.materials.map { "Materials: \($0)" },
        ].compactMap { $0 }

        guard !parts.isEmpty else { return nil }

        let prompt = """
        One punchy sentence (max 20 words) for an architecture enthusiast about this NYC building. \
        Be specific — mention style, era, or a standout quality. Start with the most interesting fact. \
        No "This building" opener. Data: \(parts.joined(separator: ", "))
        """

        return await GeminiService.generate(prompt: prompt, maxTokens: 80)
    }
}
