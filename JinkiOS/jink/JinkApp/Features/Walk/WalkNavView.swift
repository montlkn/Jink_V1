import SwiftUI
import CoreLocation
import MapKit
import UIKit
import Auth
import Supabase

// MARK: - WalkNavView

struct WalkNavView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @Bindable var vm: WalkViewModel
    @Environment(\.dismiss) private var dismiss
    var onWalkComplete: (() -> Void)? = nil

    // Mini-map region
    @State private var walkMapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7549, longitude: -73.9840),
        span: MKCoordinateSpan(latitudeDelta: 0.004, longitudeDelta: 0.004)
    )

    // Verify celebration state
    @State private var flashOpacity: Double = 0
    @State private var xpBumpScale: Double = 1
    @State private var isVerifyCooldown: Bool = false

    // Camera states
    @State private var showAdHocScan = false

    private let arProximityThreshold: Double = 150 // metres

    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            VStack(spacing: 0) {
                WalkNavHeader(vm: vm, onPause: { dismiss() }, xpScale: xpBumpScale)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                WalkBuildingCard(vm: vm)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .transition(.move(edge: .leading).combined(with: .opacity))
                    .id(vm.currentBuildingIndex)

                if let stop = vm.currentStop {
                    let stopCoord = CLLocationCoordinate2D(latitude: stop.latitude, longitude: stop.longitude)
                    Map(position: .constant(.region(walkMapRegion))) {
                        UserAnnotation()
                        Annotation("", coordinate: stopCoord) {
                            Circle().fill(AppColors.accent).frame(width: 14, height: 14)
                                .overlay(Circle().stroke(.white, lineWidth: 2))
                        }
                        .annotationTitles(.hidden)
                    }
                    .mapStyle(.standard(elevation: .flat, pointsOfInterest: .excludingAll))
                    .mapControls { }
                    .frame(height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .onAppear { walkMapRegion.center = stopCoord }
                    .onChange(of: vm.currentBuildingIndex) { _, _ in
                        withAnimation { walkMapRegion.center = stopCoord }
                    }
                } else {
                    Spacer(minLength: 0)
                }

                GlassCompass(vm: vm)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)

                Spacer(minLength: 0)

                WalkNavFooter(
                    vm: vm,
                    completeAction: { Task { await completeWalk() } },
                    adHocScanAction: { showAdHocScan = true },
                    routeInstruction: vm.currentRouteInstruction
                )
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }


            // Green flash overlay on verify
            Color.green
                .ignoresSafeArea()
                .opacity(flashOpacity)
                .allowsHitTesting(false)
        }
        .navigationBarHidden(true)
        .toolbar(vm.isWalkActive ? .hidden : .visible, for: .tabBar)
        .onChange(of: vm.distanceToCurrentStop) { _, dist in
            guard let dist, !vm.showARProximity, !vm.showInsights, !isVerifyCooldown else { return }
            if dist <= arProximityThreshold {
                vm.showARProximity = true
            }
        }
        .fullScreenCover(isPresented: $vm.showARProximity) {
            WalkARProximityView(vm: vm)
                .environment(appState)
                .environment(locationService)
        }
        .fullScreenCover(isPresented: $showAdHocScan) {
            ScanView(showDismissButton: true)
        }
        .sheet(isPresented: $vm.showInsights) {
            if let detail = vm.verifiedBuildingDetail {
                WalkStopInsightsView(detail: detail, onContinue: {
                    vm.showInsights = false
                    triggerVerifyCelebration()
                })
            }
        }
        .sheet(isPresented: $vm.showXPSummary) {
            if let stats = vm.completionStats {
                WalkSummaryView(stats: stats, onDone: {
                    dismiss()
                    onWalkComplete?()
                    refreshAppState()
                })
            } else {
                XPSummarySheet(xpEarned: vm.xpEarned ?? 100)
                    .onDisappear { refreshAppState() }
            }
        }
        .alert("Error", isPresented: .constant(vm.errorMessage != nil), actions: {
            Button("OK") { vm.errorMessage = nil }
        }, message: {
            Text(vm.errorMessage ?? "")
        })
    }

    private func refreshAppState() {
        Task {
            if appState.currentUser != nil {
                _ = try? await SupabaseService.shared.client.auth.refreshSession()
            }
        }
    }

    private func triggerVerifyCelebration() {
        guard !isVerifyCooldown else { return }
        if let stop = vm.currentStop, vm.visitedBuildingIds.contains(stop.id) { return }

        vm.visitBuilding()
        isVerifyCooldown = true

        withAnimation(.easeOut(duration: 0.08)) { flashOpacity = 0.18 }
        withAnimation(.easeIn(duration: 0.35).delay(0.08)) { flashOpacity = 0 }
        withAnimation(.spring(response: 0.2, dampingFraction: 0.4)) { xpBumpScale = 1.4 }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6).delay(0.2)) { xpBumpScale = 1 }

        Task {
            try? await Task.sleep(for: .seconds(1.5))
            isVerifyCooldown = false
        }
    }

    private func completeWalk() async {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        await vm.completeWalk(userId: userId, appState: appState)
    }
}
