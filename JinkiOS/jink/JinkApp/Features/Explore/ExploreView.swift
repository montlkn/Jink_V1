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
    @State private var lastLoadCenter: CLLocationCoordinate2D? = nil
    @State private var showSearchHere = false
    @State private var searchText = ""
    // Cached clustering output — only recomputed when buildings or span changes
    @State private var mapItems: [MapItem] = []
    @State private var lastClusteredSpan: MKCoordinateSpan = MKCoordinateSpan(latitudeDelta: 0, longitudeDelta: 0)

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
            .ignoresSafeArea(.all, edges: .top)
            .onChange(of: region.center.latitude) { _, _ in updateSearchHereVisibility() }
            .onChange(of: region.center.longitude) { _, _ in updateSearchHereVisibility() }
            // Recluster when zoom level changes meaningfully (ignore tiny pan-induced span drift)
            .onChange(of: region.span.latitudeDelta) { _, newSpan in
                let diff = abs(newSpan - lastClusteredSpan.latitudeDelta)
                if diff > lastClusteredSpan.latitudeDelta * 0.15 { recomputeMapItems() }
            }
            .onChange(of: vm.buildings.count) { _, _ in recomputeMapItems() }

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
            recomputeMapItems()
        }
    }

    private func recomputeMapItems() {
        let buildings = vm.buildings.filter { $0.latitude != nil && $0.longitude != nil }
        mapItems = computeMapItems(buildings: buildings, span: region.span)
        lastClusteredSpan = region.span
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


// MARK: - Building Detail Sheet


// MARK: - Meta Row (full-width, no truncation)


// MARK: - Gemini one-liner

