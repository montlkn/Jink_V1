import SwiftUI
import MapKit

struct ExploreSearchResultsView: View {
    let buildings: [Building]
    let vm: ExploreViewModel
    @Binding var region: MKCoordinateRegion
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(buildings) { building in
                    SearchResultCard(building: building, vm: vm) {
                        if let lat = building.latitude, let lng = building.longitude {
                            withAnimation(.spring(response: 0.45, dampingFraction: 0.75)) {
                                region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                                region.span = MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                            }
                            vm.selectedBuilding = building
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

struct SearchResultCard: View {
    let building: Building
    let vm: ExploreViewModel
    let action: () -> Void
    
    private var score: Double { vm.matchScore(for: building) }
    private var color: Color { archetypeColor(for: building.primaryAesthetic ?? building.style) }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Thumbnail with Fallback
                AsyncImage(url: URL(string: "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(building.bin)/0deg_40pitch.jpg")) { phase in
                    if let img = phase.image {
                        img.resizable().scaledToFill()
                    } else if phase.error != nil {
                        AsyncImage(url: URL(string: "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(building.bin)/0deg_0pitch.jpg")) { phase2 in
                            if let img2 = phase2.image { img2.resizable().scaledToFill() }
                            else { Rectangle().fill(Color(.systemGray6)).overlay(Image(systemName: "building.2").foregroundStyle(.secondary)) }
                        }
                    } else { Rectangle().fill(Color(.systemGray6)).overlay(ProgressView().scaleEffect(0.5)) }
                }
                .frame(width: 50, height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(building.name ?? building.address ?? "Building")
                        .font(.system(size: 14, weight: .bold))
                        .lineLimit(1)
                        .foregroundStyle(.primary)
                    
                    HStack(spacing: 4) {
                        Text("\(Int(score * 100))% MATCH")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(color)
                        
                        if let center = vm.loadCenter {
                            let bLoc = CLLocation(latitude: building.latitude ?? 0, longitude: building.longitude ?? 0)
                            let cLoc = CLLocation(latitude: center.latitude, longitude: center.longitude)
                            let dist = bLoc.distance(from: cLoc) / 1000.0
                            Text("•")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                            Text(String(format: "%.1fkm", dist))
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(width: 140, alignment: .leading)
            }
            .padding(8)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }
}
