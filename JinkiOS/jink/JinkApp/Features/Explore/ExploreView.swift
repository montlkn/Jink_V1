import Auth
import SwiftUI
import MapKit
import UIKit

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
    @State private var mapItems: [MapItem] = []
    @State private var lastClusteredSpan: MKCoordinateSpan = MKCoordinateSpan(latitudeDelta: 0, longitudeDelta: 0)
    @State private var communityPosts: [CommunityPost] = []
    @State private var selectedPost: CommunityPost? = nil
    @State private var showCommunityPosts = true

    var body: some View {
        ZStack(alignment: .top) {
            Map(position: Binding(
                get: { .region(region) },
                set: { if let r = $0.region { region = r } }
            )) {
                UserAnnotation()
                ForEach(mapItems) { item in
                    Annotation("", coordinate: item.coordinate) {
                        switch item {
                        case .single(let b):
                            BuildingCallout(building: b, isSelected: vm.selectedBuilding?.bin == b.bin)
                                .onTapGesture { vm.selectedBuilding = b }
                        case .cluster(let n, _, let d):
                            ClusterPin(count: n, dominantAesthetic: d)
                                .onTapGesture {
                                    withAnimation {
                                        region.center = item.coordinate
                                        region.span = MKCoordinateSpan(latitudeDelta: region.span.latitudeDelta * 0.4, longitudeDelta: region.span.longitudeDelta * 0.4)
                                    }
                                }
                        }
                    }
                    .annotationTitles(.hidden)
                }

                // Community post pins
                if showCommunityPosts {
                    ForEach(communityPosts.filter { $0.latitude != nil && $0.longitude != nil }) { post in
                        let coord = CLLocationCoordinate2D(latitude: post.latitude!, longitude: post.longitude!)
                        Annotation("", coordinate: coord) {
                            CommunityPostPin(post: post)
                                .onTapGesture { selectedPost = post }
                        }
                        .annotationTitles(.hidden)
                    }
                }
            }
            .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
            .ignoresSafeArea(.all, edges: .top)
            .onMapCameraChange { context in
                region = context.region
                updateSearchHereVisibility()
                Task { await loadCommunityPosts() }
            }
            .onChange(of: region.span.latitudeDelta) { _, _ in recomputeMapItems() }
            .onChange(of: vm.buildings.count) { _, _ in recomputeMapItems() }
            .onChange(of: vm.searchResults.count) { _, _ in recomputeMapItems() }
            .mapControls { MapUserLocationButton(); MapCompass() }

            VStack(spacing: 0) {
                // TOP BAR
                HStack(alignment: .top) {
                    Spacer().frame(width: 80)
                    Spacer()
                    if showSearchHere || vm.isLoading {
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
                                    Text("Searching…").font(.system(size: 14, weight: .semibold)).foregroundStyle(.primary)
                                } else {
                                    Image(systemName: "magnifyingglass").font(.system(size: 12, weight: .semibold))
                                    Text("Search this area").font(.system(size: 14, weight: .semibold))
                                }
                            }
                            .foregroundStyle(showSearchHere ? .white : .primary)
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(showSearchHere ? AnyShapeStyle(AppColors.accent) : AnyShapeStyle(.regularMaterial), in: Capsule())
                            .shadow(color: .black.opacity(0.15), radius: 6, x: 0, y: 2)
                        }
                        .transition(.scale.combined(with: .opacity).animation(.spring(response: 0.3, dampingFraction: 0.7)))
                    }
                    Spacer()
                    HStack(spacing: 8) {
                        Button {
                            showCommunityPosts.toggle()
                        } label: {
                            Image(systemName: "lightbulb.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(showCommunityPosts ? .yellow : .secondary)
                                .frame(width: 36, height: 36)
                                .background(.regularMaterial, in: Circle())
                                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                        }
                        DismissButton()
                    }.frame(width: 80, alignment: .trailing)
                }
                .padding(.horizontal, 16).padding(.top, 60)
                
                Spacer()
                
                // BOTTOM AREA
                VStack(spacing: 12) {
                    if !vm.searchResults.isEmpty && !searchText.isEmpty {
                        ExploreSearchResultsView(buildings: vm.searchResults, vm: vm, region: $region)
                    }

                    HStack(alignment: .bottom) {
                        ArchetypeLegend().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12)).shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                        Spacer()
                        Button {
                            let coord = locationService.location?.coordinate ?? CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840)
                            withAnimation { region.center = coord }
                        } label: {
                            Image(systemName: "location.fill").font(.title3).foregroundStyle(.white).frame(width: 48, height: 48).background(AppColors.accent, in: Circle()).shadow(color: AppColors.accent.opacity(0.4), radius: 8, x: 0, y: 4)
                        }
                    }
                    .padding(.horizontal, 16)
                    
                    ExploreSearchBar(searchText: $searchText) {
                        guard !searchText.isEmpty else { vm.searchResults = []; return }
                        Task {
                            await vm.search(query: searchText, center: region.center)
                            if let first = vm.searchResults.first, let lat = first.latitude, let lng = first.longitude {
                                withAnimation {
                                    region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                                    region.span = MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                                }
                            }
                        }
                    }
                }
                .padding(.bottom, 20)
            }
        }
        .sheet(item: $vm.selectedBuilding) { b in
            BuildingDetailSheet(building: b, vm: vm)
                .presentationDetents([PresentationDetent.height(700)])
                .presentationDragIndicator(Visibility.visible)
        }
        .sheet(item: $selectedPost) { post in
            CommunityPostDetailSheet(post: post)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .navigationBarHidden(true)
        .task {
            let coord = locationService.location?.coordinate ?? CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840)
            withAnimation { region.center = coord }
            lastLoadCenter = coord
            let userId = appState.currentUser?.id.uuidString
            await vm.load(near: coord, userId: userId)
            await loadCommunityPosts()
            recomputeMapItems()
        }
    }

    private func recomputeMapItems() {
        let source = vm.searchResults.isEmpty ? vm.buildings : vm.searchResults
        let filtered = source.filter { $0.latitude != nil && $0.longitude != nil }
        let currentSpan = region.span
        Task.detached(priority: .userInitiated) {
            let items = computeMapItems(buildings: filtered, span: currentSpan)
            await MainActor.run { self.mapItems = items; self.lastClusteredSpan = currentSpan }
        }
    }

    private func updateSearchHereVisibility() {
        guard let last = lastLoadCenter else { return }
        let current = CLLocation(latitude: region.center.latitude, longitude: region.center.longitude)
        let loaded = CLLocation(latitude: last.latitude, longitude: last.longitude)
        let drifted = current.distance(from: loaded) > 300
        if drifted && !showSearchHere { withAnimation { showSearchHere = true } }
        else if !drifted && showSearchHere { withAnimation { showSearchHere = false } }
    }

    private func loadCommunityPosts() async {
        let span = region.span
        let center = region.center
        do {
            communityPosts = try await CommunityPostService.shared.fetchPosts(
                minLat: center.latitude - span.latitudeDelta / 2,
                maxLat: center.latitude + span.latitudeDelta / 2,
                minLng: center.longitude - span.longitudeDelta / 2,
                maxLng: center.longitude + span.longitudeDelta / 2
            )
        } catch {
            print("[ExploreView] Failed to load community posts: \(error)")
        }
    }
}

// MARK: - Dismiss Button

private struct DismissButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button { dismiss() } label: {
            Image(systemName: "xmark")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.primary)
                .frame(width: 36, height: 36)
                .background(.regularMaterial, in: Circle())
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
            Circle().fill(color).frame(width: 32, height: 32).overlay(Circle().stroke(.white, lineWidth: 1.5)).shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 2)
            Text("\(count)").font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
        }
    }
}

// MARK: - Building callout pill

private struct BuildingCallout: View {
    let building: Building
    let isSelected: Bool
    private var color: Color { archetypeColor(for: building.primaryAesthetic ?? building.style) }
    private var label: String { building.address ?? building.name ?? "Building" }
    var body: some View {
        VStack(spacing: 0) {
            Text(label).font(.system(size: 9, weight: .semibold)).foregroundStyle(.white).lineLimit(1).frame(maxWidth: 130).padding(.horizontal, 7).padding(.vertical, 4).background(color).clipShape(RoundedRectangle(cornerRadius: 6)).overlay(RoundedRectangle(cornerRadius: 6).stroke(.white, lineWidth: isSelected ? 1.5 : 0)).scaleEffect(isSelected ? 1.08 : 1.0)
            Triangle().fill(color).frame(width: 8, height: 6)
        }.shadow(color: .black.opacity(0.25), radius: 2, x: 0, y: 1).animation(.easeOut(duration: 0.15), value: isSelected)
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in p.move(to: CGPoint(x: rect.midX, y: rect.maxY)); p.addLine(to: CGPoint(x: rect.minX, y: rect.minY)); p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY)); p.closeSubpath() }
    }
}

// MARK: - Archetype Legend

private struct ArchetypeLegend: View {
    private let entries: [(name: String, color: Color)] = [
        ("Classicist", AppColors.archetypes.classicist), ("Modernist", AppColors.archetypes.modernist),
        ("Vernacularist", AppColors.archetypes.vernacularist), ("Industrialist", AppColors.archetypes.industrialist)
    ]
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(entries, id: \.name) { entry in
                HStack(spacing: 6) {
                    Circle().fill(entry.color).frame(width: 8, height: 8)
                    Text(entry.name).font(.system(size: 10, weight: .semibold)).foregroundStyle(.primary)
                }
            }
        }.padding(.horizontal, 10).padding(.vertical, 8)
    }
}

// MARK: - Community Post Pin

struct CommunityPostPin: View {
    let post: CommunityPost
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 28, height: 28)
                    .overlay(Circle().stroke(.white, lineWidth: 1.5))
                    .shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 2)
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white)
            }
            Triangle().fill(Color.yellow).frame(width: 8, height: 6)
        }
    }
}

// MARK: - Community Post Detail Sheet

struct CommunityPostDetailSheet: View {
    let post: CommunityPost

    var body: some View {
        VStack(spacing: 16) {
            // Photo
            AsyncImage(url: URL(string: post.imageUrl)) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else if phase.error != nil {
                    Color.gray.opacity(0.2)
                        .overlay(Image(systemName: "photo").foregroundStyle(.secondary))
                } else {
                    ProgressView()
                }
            }
            .frame(height: 220)
            .clipped()
            .cornerRadius(12)
            .padding(.horizontal)

            // Caption
            Text(post.caption)
                .font(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

            // Metadata
            HStack(spacing: 12) {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(.yellow)
                Text("Community Find")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                Spacer()
                if let date = post.createdAt {
                    Text(date, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            Spacer()
        }
        .padding(.top, 20)
    }
}

