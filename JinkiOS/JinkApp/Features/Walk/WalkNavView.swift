import SwiftUI
import MapboxMaps
import CoreLocation

struct WalkNavView: View {
    @Environment(AppState.self) private var appState
    @Bindable var vm: WalkViewModel
    @State private var cameraState: CameraState? = nil

    var body: some View {
        ZStack(alignment: .bottom) {
            // Mapbox map
            MapReader { proxy in
                Map(initialViewport: defaultViewport) {
                    // User location puck
                    Puck2D(bearing: .heading)

                    // Route polyline
                    if vm.routeCoordinates.count > 1 {
                        PolylineAnnotation(lineCoordinates: vm.routeCoordinates)
                            .lineColor(.init(AppColors.passport.walk))
                            .lineWidth(4)
                    }
                }
                .mapStyle(.standard(lightPreset: .dusk))
                .ignoresSafeArea()
            }

            // Bottom panel
            VStack(spacing: 0) {
                // Stats strip
                HStack(spacing: 0) {
                    StatPill(
                        label: "Points",
                        value: "\(vm.routeCoordinates.count)"
                    )
                    Divider().frame(height: 32)
                    StatPill(
                        label: "Status",
                        value: vm.isWalkActive ? "Active" : "Done"
                    )
                }
                .padding(.horizontal)
                .padding(.top, 16)

                // Complete button
                Button {
                    Task { await completeWalk() }
                } label: {
                    HStack {
                        if vm.isCompleting {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "flag.checkered")
                            Text("Complete Walk")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AppColors.passport.walk, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(.white)
                }
                .padding()
                .disabled(vm.isCompleting)
            }
            .background(.regularMaterial)
        }
        .navigationTitle("Walk")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $vm.showXPSummary) {
            XPSummarySheet(xpEarned: vm.xpEarned ?? 100)
        }
        .alert("Error", isPresented: .constant(vm.errorMessage != nil), actions: {
            Button("OK") { vm.errorMessage = nil }
        }, message: {
            Text(vm.errorMessage ?? "")
        })
    }

    private var defaultViewport: Viewport {
        .camera(center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060), zoom: 15)
    }

    private func completeWalk() async {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        await vm.completeWalk(userId: userId)
    }
}

struct StatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.headline.monospacedDigit())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}

struct XPSummarySheet: View {
    let xpEarned: Int
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(AppColors.accent)
                .symbolEffect(.bounce)

            Text("Walk Complete!")
                .font(.largeTitle.bold())

            Text("+\(xpEarned) XP")
                .font(.title.bold())
                .foregroundStyle(AppColors.accent)

            Button("Done") { dismiss() }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.passport.walk)
        }
        .padding(40)
        .presentationDetents([.medium])
    }
}
