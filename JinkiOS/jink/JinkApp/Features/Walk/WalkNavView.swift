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

                if vm.currentStop != nil {
                    xpMapSection
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
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

    // MARK: - XP Map Section

    @ViewBuilder
    private var xpMapSection: some View {
        if let snapshot = vm.mapSnapshotImage, vm.mapRevealedForStopId == vm.currentStop?.id {
            // Revealed: frozen Nolli-style map image
            ZStack(alignment: .topTrailing) {
                Image(uiImage: snapshot)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                // "MAP" label
                Text("MAP")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(.black.opacity(0.4), in: Capsule())
                    .padding(10)
            }
            .transition(.opacity.combined(with: .scale(scale: 0.96)))
        } else {
            // Not revealed: XP spend button
            VStack(spacing: 6) {
                if vm.isMapRevealing {
                    HStack(spacing: 8) {
                        ProgressView().tint(AppColors.accent)
                        Text("Loading map…")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }
                    .frame(height: 44)
                } else {
                    Button {
                        Task {
                            guard let userId = appState.currentUser?.id.uuidString else { return }
                            await vm.revealMap(userId: userId)
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "map.fill")
                                .font(.system(size: 14))
                            Text("Reveal Map")
                                .font(.system(size: 13, weight: .semibold))
                            Spacer()
                            HStack(spacing: 3) {
                                Image(systemName: "bolt.fill")
                                    .font(.system(size: 11))
                                Text("25 XP")
                                    .font(.system(size: 12, weight: .bold))
                            }
                        }
                        .foregroundStyle(AppColors.accent)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(AppColors.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.accent.opacity(0.3), lineWidth: 1))
                    }

                    if let err = vm.mapRevealError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}
