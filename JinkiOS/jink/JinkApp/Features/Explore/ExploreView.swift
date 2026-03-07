import SwiftUI
import MapKit

struct ExploreView: View {
    @Environment(LocationService.self) private var locationService
    @State private var vm = ExploreViewModel()
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840), // Midtown NYC default
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Map(coordinateRegion: $region, showsUserLocation: true, annotationItems: mapBuildings) { building in
                MapAnnotation(coordinate: CLLocationCoordinate2D(
                    latitude: building.latitude ?? 0,
                    longitude: building.longitude ?? 0
                )) {
                    BuildingPin(building: building, isSelected: vm.selectedBuilding?.bin == building.bin)
                        .onTapGesture { vm.selectedBuilding = building }
                }
            }
            .ignoresSafeArea(edges: .top)

            VStack(alignment: .trailing, spacing: 12) {
                if vm.isLoading {
                    ProgressView()
                        .padding(10)
                        .background(.regularMaterial, in: Circle())
                }

                // Recenter FAB
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
            .padding(.bottom, 20)
            .padding(.trailing, 20)
        }
        .sheet(item: $vm.selectedBuilding) { building in
            BuildingDetailSheet(building: building)
                .presentationDetents([.medium])
        }
        .navigationTitle("Explore")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            let coord = locationService.location?.coordinate
                ?? CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840)
            withAnimation { region.center = coord }
            await vm.load(near: coord)
        }
    }

    // Filter to buildings with valid coordinates
    private var mapBuildings: [Building] {
        vm.buildings.filter { $0.latitude != nil && $0.longitude != nil }
    }
}

// MARK: - Building pin annotation

private struct BuildingPin: View {
    let building: Building
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(aestheticColor(for: building.primaryAesthetic))
                .frame(width: isSelected ? 16 : 10, height: isSelected ? 16 : 10)
                .overlay(Circle().stroke(.white, lineWidth: isSelected ? 2 : 1))
                .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
        }
        .animation(.easeOut(duration: 0.15), value: isSelected)
    }

    private func aestheticColor(for aesthetic: String?) -> Color {
        switch aesthetic?.lowercased() {
        case "art deco":        return Color(red: 0.85, green: 0.65, blue: 0.13)
        case "modernist":       return Color(red: 0.20, green: 0.60, blue: 0.90)
        case "beaux-arts":      return Color(red: 0.80, green: 0.50, blue: 0.20)
        case "brutalist":       return Color(red: 0.50, green: 0.50, blue: 0.55)
        case "gothic":          return Color(red: 0.40, green: 0.25, blue: 0.60)
        case "neoclassical":    return Color(red: 0.75, green: 0.70, blue: 0.55)
        case "industrial":      return Color(red: 0.45, green: 0.40, blue: 0.35)
        case "postmodern":      return Color(red: 0.90, green: 0.35, blue: 0.45)
        default:                return AppColors.accent
        }
    }
}

// MARK: - Building Detail Sheet

private struct BuildingDetailSheet: View {
    let building: Building
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(building.name ?? "Unknown Building")
                    .font(.title3.bold())
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                        .font(.title2)
                }
            }

            if let address = building.address {
                Label(address, systemImage: "mappin")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 20) {
                if let style = building.style {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("STYLE").font(.caption2).foregroundStyle(.secondary)
                        Text(style).font(.caption.bold())
                    }
                }
                if let year = building.yearBuilt {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("BUILT").font(.caption2).foregroundStyle(.secondary)
                        Text(year).font(.caption.bold())
                    }
                }
                if let architect = building.architect {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ARCHITECT").font(.caption2).foregroundStyle(.secondary)
                        Text(architect).font(.caption.bold()).lineLimit(1)
                    }
                }
            }

            if let desc = building.description, !desc.isEmpty {
                Text(desc)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(5)
            }

            Spacer()
        }
        .padding(24)
    }
}
