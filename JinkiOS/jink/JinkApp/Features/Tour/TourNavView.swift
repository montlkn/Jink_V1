import SwiftUI
import CoreLocation
import MapKit

struct TourNavView: View {
    @Bindable var vm: TourViewModel
    @Environment(LocationService.self) private var locationService
    @Environment(\.dismiss) private var dismiss

    // Map State
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)

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
                Map(position: $position) {
                    if let checkpoint = vm.currentCheckpoint {
                        Annotation(checkpoint.name, coordinate: CLLocationCoordinate2D(latitude: checkpoint.latitude, longitude: checkpoint.longitude)) {
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
                }
                .mapControls {
                    MapUserLocationButton()
                    MapCompass()
                }
                .ignoresSafeArea(.all, edges: .top)
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
            let rect = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: midLat, longitude: midLng),
                span: MKCoordinateSpan(
                    latitudeDelta: max(0.005, latDelta),
                    longitudeDelta: max(0.005, lngDelta)
                )
            )
            position = .region(rect)
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


