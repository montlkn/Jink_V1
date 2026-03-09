import SwiftUI
import CoreLocation
import MapKit

struct TourNavView: View {
    @Bindable var vm: TourViewModel
    @Environment(LocationService.self) private var locationService
    @Environment(\.dismiss) private var dismiss

    // Map State
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840),
        span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
    )
    @State private var trackingMode: MapUserTrackingMode = .follow
    
    // View Mode
    @State private var useARMode = true

    var body: some View {
        Group {
            if vm.state == .completed {
                TourCompleteView(vm: vm, onDone: { dismiss() })
            } else {
                tourActiveBody
            }
        }
    }

    private var tourActiveBody: some View {
        ZStack(alignment: .bottom) {
            // Background ambient glow or Map/AR
            if useARMode {
                TourARView(checkpoint: vm.currentCheckpoint, isNear: vm.isNearCurrentCheckpoint)
                    .ignoresSafeArea()
            } else {
                Map(coordinateRegion: $region,
                    interactionModes: .all,
                    showsUserLocation: true,
                    userTrackingMode: $trackingMode,
                    annotationItems: vm.currentCheckpoint != nil ? [vm.currentCheckpoint!] : []) { checkpoint in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: checkpoint.latitude, longitude: checkpoint.longitude)) {
                        VStack(spacing: 0) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title)
                                .foregroundStyle(AppColors.accent)
                                .background(Circle().fill(.white))
                            
                            Text(checkpoint.name)
                                .font(.caption.bold())
                                .padding(4)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
                                .offset(y: 4)
                        }
                    }
                }
                .ignoresSafeArea(edges: .top)
            }

            if vm.isNearCurrentCheckpoint {
                Color.green.opacity(0.1).ignoresSafeArea()
            }

            VStack(spacing: 0) {
                // Progress bar (top of sheet)
                progressBar

                if let checkpoint = vm.currentCheckpoint {
                    VStack(spacing: 16) {
                        // Stop counter
                        HStack {
                            Text("Stop \(vm.currentCheckpointIndex + 1) of \(vm.tour?.checkpoints.count ?? 0)")
                                .font(.caption.bold())
                                .foregroundStyle(.primary)
                            Spacer()
                            Text(vm.elapsedLabel)
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                            Text("·")
                                .foregroundStyle(.secondary)
                            Text(vm.distanceLabel)
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal)
                        .padding(.top, 16)

                        // Checkpoint card
                        CheckpointCard(
                            checkpoint: checkpoint,
                            isNear: vm.isNearCurrentCheckpoint,
                            onAbout: { vm.showAboutSheet = true }
                        )

                        // Action buttons
                        VStack(spacing: 12) {
                            Button(action: handlePrimaryAction) {
                                HStack {
                                    Image(systemName: vm.isNearCurrentCheckpoint ? "checkmark.circle.fill" : "arrow.right.circle.fill")
                                    Text(vm.isNearCurrentCheckpoint ? "Check In Here" : "Walk to Checkpoint")
                                }
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(vm.isNearCurrentCheckpoint ? Color.green : AppColors.accent, in: RoundedRectangle(cornerRadius: 14))
                                .foregroundStyle(.white)
                            }
                            .disabled(!vm.isNearCurrentCheckpoint) // Disable until they arrive

                            HStack {
                                Button(action: { vm.advanceCheckpoint() }) {
                                    Text("Skip Stop")
                                        .font(.caption.bold())
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    vm.endTour()
                                } label: {
                                    Text("End Tour Early")
                                        .font(.caption.bold())
                                        .foregroundStyle(.red.opacity(0.8))
                                }
                            }
                            .padding(.horizontal, 8)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 32)
                    }
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .shadow(color: .black.opacity(0.1), radius: 10, y: -5)
                }
            }
        }
        .navigationTitle(vm.tour?.name ?? "Tour")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 16) {
                    Button(action: { withAnimation { useARMode.toggle() } }) {
                        Image(systemName: useARMode ? "map.fill" : "arkit")
                            .foregroundStyle(AppColors.accent)
                    }
                    if !useARMode {
                        Button(action: recenterMap) {
                            Image(systemName: "location.fill")
                                .foregroundStyle(AppColors.accent)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $vm.showAboutSheet) {
            if let checkpoint = vm.currentCheckpoint {
                AboutCheckpointSheet(checkpoint: checkpoint)
                    .presentationDetents([.medium, .large])
            }
        }
        .onChange(of: locationService.location) { _, newLocation in
            if let newLocation {
                vm.updateLocation(newLocation)
            }
        }
        .onChange(of: vm.currentCheckpointIndex) { _, _ in
            recenterMap()
        }
        .onAppear {
            if let location = locationService.location {
                vm.updateLocation(location)
            }
            recenterMap()
        }
    }

    private func recenterMap() {
        guard let location = locationService.location, let checkpoint = vm.currentCheckpoint else { return }
        
        // Find midpoint between user and checkpoint
        let midLat = (location.coordinate.latitude + checkpoint.latitude) / 2
        let midLng = (location.coordinate.longitude + checkpoint.longitude) / 2
        
        let latDelta = abs(location.coordinate.latitude - checkpoint.latitude) * 1.5
        let lngDelta = abs(location.coordinate.longitude - checkpoint.longitude) * 1.5
        
        withAnimation {
            region = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: midLat, longitude: midLng),
                span: MKCoordinateSpan(
                    latitudeDelta: max(0.005, latDelta),
                    longitudeDelta: max(0.005, lngDelta)
                )
            )
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color(.systemGray5))
                    .frame(height: 3)
                Rectangle()
                    .fill(AppColors.accent)
                    .frame(width: geo.size.width * vm.progressFraction, height: 3)
                    .animation(.easeInOut, value: vm.progressFraction)
            }
        }
        .frame(height: 3)
    }

    private func handlePrimaryAction() {
        if vm.isNearCurrentCheckpoint {
            vm.verifyLocation()
        }
        // If not near, user needs to walk to the checkpoint
    }
}

// MARK: - Checkpoint Card

struct CheckpointCard: View {
    let checkpoint: TourCheckpoint
    let isNear: Bool
    let onAbout: () -> Void

    var typeColor: Color {
        switch checkpoint.type {
        case .building: return AppColors.accent
        case .waypoint: return .orange
        case .viewpoint: return .purple
        }
    }

    var typeIcon: String {
        switch checkpoint.type {
        case .building: return "building.2.fill"
        case .waypoint: return "flag.fill"
        case .viewpoint: return "eye.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(checkpoint.type.rawValue.capitalized, systemImage: typeIcon)
                    .font(.caption.bold())
                    .foregroundStyle(typeColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(typeColor.opacity(0.12), in: Capsule())

                Spacer()

                if isNear {
                    Label("YOU'RE HERE", systemImage: "location.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.12), in: Capsule())
                }
            }

            Text(checkpoint.name)
                .font(.title3.bold())

            if let address = checkpoint.address {
                Text(address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(checkpoint.narrative)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(4)

            Button(action: onAbout) {
                HStack {
                    Image(systemName: "info.circle")
                    Text("About This Stop")
                }
                .font(.caption.bold())
                .foregroundStyle(AppColors.accent)
            }
        }
        .padding(16)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isNear ? Color.green : Color.clear, lineWidth: 2)
        )
        .animation(.easeInOut, value: isNear)
        .padding(.horizontal)
    }
}

// MARK: - About Checkpoint Sheet

struct AboutCheckpointSheet: View {
    let checkpoint: TourCheckpoint
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(checkpoint.name)
                        .font(.title2.bold())
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Narrative")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                        Text(checkpoint.narrative)
                            .font(.body)
                            .padding(.horizontal)
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Label("Fun Fact", systemImage: "lightbulb.fill")
                            .font(.caption.bold())
                            .foregroundStyle(.orange)
                            .padding(.horizontal)
                        Text(checkpoint.funFact)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("About This Stop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
