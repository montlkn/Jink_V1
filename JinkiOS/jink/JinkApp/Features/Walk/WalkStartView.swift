import Auth
import Supabase
import SwiftUI
import UIKit
import Combine



// MARK: - Walk Start View

struct WalkStartView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @State private var vm: WalkViewModel
    @State private var time: Double = 30
    @State private var includeVisited = false
    @State private var navigateToNav = false
    @State private var showXPDetail = false
    @State private var showExplore = false
    @State private var xp: Int = 0
    @State private var level: Int = 1
    @State private var streakCount: Int = 0
    @State private var aestheticProfile: AestheticProfile? = nil
    @State private var instructionToggle = false
    private let instructionTimer = Timer.publish(every: 3.0, on: .main, in: .common).autoconnect()

    init() {
        _vm = State(initialValue: WalkViewModel(locationService: LocationService()))
    }

    private var xpBonusColor: Color {
        switch time {
        case ..<10: return Color(hex: "#9E9E9E") // 1x Gray
        case ..<15: return Color(hex: "#4FC3F7") // 1.25x Blue
        case ..<30: return Color(hex: "#66BB6A") // 1.5x Green
        case ..<40: return Color(hex: "#9E9E9E") // 1x Gray
        case ..<60: return Color(hex: "#EF5350") // 2x Red
        case ..<70: return Color(hex: "#4FC3F7") // 1.25x Blue
        case ..<80: return Color(hex: "#9E9E9E") // 1x Gray
        default:    return Color(hex: "#EF5350") // 2x Red (80+)
        }
    }

    private var xpMultiplierString: String {
        switch time {
        case ..<10: return "1X XP"
        case ..<15: return "1.25X XP"
        case ..<30: return "1.5X XP"
        case ..<40: return "1X XP"
        case ..<60: return "2X XP"
        case ..<70: return "1.25X XP"
        case ..<80: return "1X XP"
        default:    return "2X XP"
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemBackground).ignoresSafeArea()

                VStack(spacing: 0) {

                    // ── Header: XP level orb (tappable) + map placeholder ──
                    HStack(alignment: .center) {
                        // XP Orb — clean circle with colored ring, tap opens detail
                        let prog = getProgressToNextLevel(xp)
                        let tierCol = getTierColor(prog.currentTier)
                        Button { showXPDetail = true } label: {
                            ZStack {
                                // Base circle (neutral)
                                Circle()
                                    .fill(Color(.systemGray6))
                                    .frame(width: 56, height: 56)
                                // Progress ring
                                Circle()
                                    .trim(from: 0, to: CGFloat(prog.progressPercent / 100))
                                    .stroke(tierCol.opacity(0.3 + 0.7 * (prog.progressPercent / 100)), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                                    .frame(width: 54, height: 54)
                                    .rotationEffect(.degrees(-90))
                                // Background ring track
                                Circle()
                                    .stroke(tierCol.opacity(0.15), lineWidth: 3)
                                    .frame(width: 54, height: 54)
                                // Level number
                                VStack(spacing: 0) {
                                    Text("\(prog.currentLevel)")
                                        .font(.system(size: 20, weight: .bold, design: .rounded))
                                        .foregroundStyle(Color(.label))
                                }
                            }
                            .frame(width: 56, height: 56)
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        Text(xpMultiplierString)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(xpBonusColor))
                            .shadow(color: xpBonusColor.opacity(0.4), radius: 6, y: 3)
                            .zIndex(1)

                        Spacer()

                        // Map button → ExploreView
                        Button { showExplore = true } label: {
                            ZStack {
                                Circle()
                                    .fill(Color(.systemGray5))
                                    .frame(width: 56, height: 56)
                                Image(systemName: "map.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(AppColors.accent)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 16)

                    Spacer()

                    // ── Time row: − number + ──
                    HStack(alignment: .center, spacing: 0) {
                        Button { adjustTime(-1) } label: {
                            Text("−")
                                .font(.system(size: 44, weight: .ultraLight))
                                .foregroundStyle(.primary)
                                .opacity(0.5)
                                .frame(width: 52, height: 64)
                        }
                        .buttonStyle(.plain)

                        Text("\(Int(time))")
                            .font(.system(size: 88, weight: .heavy))
                            .foregroundStyle(xpBonusColor)
                            .monospacedDigit()
                            .contentTransition(.numericText())
                            .animation(.easeOut(duration: 0.10), value: time)
                            .frame(width: 130, alignment: .center)
                            .lineLimit(1)

                        Button { adjustTime(1) } label: {
                            Text("+")
                                .font(.system(size: 44, weight: .ultraLight))
                                .foregroundStyle(.primary)
                                .opacity(0.5)
                                .frame(width: 52, height: 64)
                        }
                        .buttonStyle(.plain)
                    }

                    Text("MIN")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .kerning(4)
                        .padding(.bottom, 12)

                    // ── Arc slider with orb centred inside ──
                    ZStack {
                        ArcTimeSlider(value: $time, min: 5, max: 95, arcColor: xpBonusColor) {}

                        let orbAesthetic = aestheticProfile ?? AestheticProfile.default
                        ArchetypeOrb(
                            aesthetic: orbAesthetic,
                            tapAction: {
                                Task { await startWalk() }
                            },
                            doubleTapAction: {
                                Task { await startNewWalk() }
                            }
                        )
                        .scaleEffect(0.72)
                    }
                    .frame(width: 310, height: 310)

                    // ── Shimmer text under the orb ──
                    ShimmerInstructionText(
                        text: vm.isWalkActive ? (instructionToggle ? "Tap twice to start new" : "Tap to resume") : "Press orb to start jink"
                    )
                    .contentTransition(.opacity)
                    .padding(.top, 22)
                    .onReceive(instructionTimer) { _ in
                        if vm.isWalkActive {
                            withAnimation(.easeInOut(duration: 0.6)) { instructionToggle.toggle() }
                        }
                    }

                    Spacer()

                    // ── NEW/ALL toggle pinned near bottom tab ──
                    NewAllToggle(includeVisited: $includeVisited)
                        .padding(.bottom, 28)
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $navigateToNav) {
                WalkNavView(vm: vm, onWalkComplete: {
                    navigateToNav = false
                    loadXP()
                })
            }
            .onAppear {
                if !vm.isWalkActive {
                    vm = WalkViewModel(locationService: locationService)
                }
                loadXP()
                loadProfile()
            }
            .sheet(isPresented: $showXPDetail) {
                XPDetailSheet(xp: xp, level: level, streakCount: streakCount)
                    .presentationDetents([.height(190)])
                    .presentationDragIndicator(.hidden)
            }
            .sheet(isPresented: $showExplore) {
                ExploreView()
                    .environment(locationService)
                    .environment(appState)
            }
            .alert("Error", isPresented: .constant(vm.errorMessage != nil)) {
                Button("OK") { vm.errorMessage = nil }
            } message: {
                Text(vm.errorMessage ?? "")
            }
        }
        .toolbar(navigateToNav ? .hidden : .visible, for: .tabBar)
        .animation(.default, value: navigateToNav)
    }

    private func loadProfile() {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task {
            do {
                struct Row: Decodable {
                    let normalizedScores: AestheticProfile?
                    enum CodingKeys: String, CodingKey { case normalizedScores = "normalized_scores" }
                }
                let rows: [Row] = try await SupabaseService.shared.client
                    .from("user_aesthetic_profiles")
                    .select("normalized_scores")
                    .eq("user_id", value: userId)
                    .execute()
                    .value
                aestheticProfile = rows.first?.normalizedScores
            } catch {
                print("[WalkStartView] Failed to load profile: \(error)")
            }
        }
    }

    private func adjustTime(_ delta: Double) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        time = min(95, max(5, time + delta))
    }

    private func startWalk() async {
        if vm.isWalkActive {
            navigateToNav = true
            return
        }
        guard let userId = appState.currentUser?.id.uuidString else { return }
        // Pass dominant archetype to vm so insights can reference the user's taste
        if let dominant = aestheticProfile?.dominant?.name {
            vm.userDominantArchetype = dominant
        }
        let routeType: WalkRouteType = time >= 60 ? .wildcard : time >= 30 ? .aesthetic : .behavioral
        await vm.startWalk(routeType: routeType, userId: userId, durationMinutes: Int(time), includeVisited: includeVisited)
        if vm.isWalkActive { navigateToNav = true }
    }

    private func startNewWalk() async {
        if vm.isWalkActive {
            vm.cancelWalk()
        }
        await startWalk()
    }

    private func loadXP() {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task {
            do {
                struct XPRow: Decodable { let total_xp: Int; let level: Int; let daily_streak_count: Int? }
                let row: XPRow = try await SupabaseService.shared.client
                    .from("profiles")
                    .select("total_xp, level, daily_streak_count")
                    .eq("id", value: userId)
                    .single()
                    .execute()
                    .value
                xp = row.total_xp
                level = getLevelFromXP(row.total_xp)
                streakCount = row.daily_streak_count ?? 0
            } catch {}
        }
    }
}

// MARK: - XP Detail Sheet

struct XPDetailSheet: View {
    let xp: Int
    let level: Int
    let streakCount: Int

    private var progress: XPProgress { getProgressToNextLevel(xp) }
    private var tierColor: Color { getTierColor(progress.currentTier) }

    var body: some View {
        VStack(spacing: 0) {
            // Handle
            Capsule()
                .fill(Color(.systemGray4))
                .frame(width: 36, height: 4)
                .padding(.top, 10)
                .padding(.bottom, 14)

            // Row: level orb | title + tier | XP count
            HStack(spacing: 16) {
                // Mini level ring
                ZStack {
                    Circle().fill(Color(.systemGray6)).frame(width: 44, height: 44)
                    Circle()
                        .trim(from: 0, to: CGFloat(progress.progressPercent / 100))
                        .stroke(tierColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .frame(width: 42, height: 42)
                        .rotationEffect(.degrees(-90))
                    Circle().stroke(tierColor.opacity(0.15), lineWidth: 3).frame(width: 42, height: 42)
                    Text("\(progress.currentLevel)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                }

                // Title + tier
                VStack(alignment: .leading, spacing: 2) {
                    Text(progress.currentTitle.uppercased())
                        .font(.system(size: 16, weight: .black))
                        .foregroundStyle(tierColor)
                        .kerning(0.5)
                    Text(progress.currentTier.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)
                        .kerning(1.5)
                }

                Spacer()

                // XP
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(progress.xpInLevel)")
                        .font(.system(size: 20, weight: .bold).monospacedDigit())
                        .foregroundStyle(tierColor)
                    Text("/ \(progress.xpNeeded) XP")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 20)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(tierColor.opacity(0.12)).frame(height: 4)
                    Rectangle()
                        .fill(tierColor)
                        .frame(width: geo.size.width * CGFloat(progress.progressPercent / 100), height: 4)
                }
            }
            .frame(height: 4)
            .padding(.horizontal, 20)
            .padding(.top, 14)

            // Hint & Streak
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(AppColors.daily)
                    let multiplier = min(1.0 + (Double(streakCount) * 0.1), 2.5)
                    Text("\(streakCount) DAY STREAK  |  \(String(format: "%.1f", multiplier))X XP")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(AppColors.daily)
                        .kerning(0.5)
                }
                .opacity(streakCount > 0 ? 1 : 0.4)

                Spacer()
                
                Text("\(progress.xpNeeded - progress.xpInLevel) XP TO NEXT RANK")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
                    .kerning(0.5)
                    .italic()
            }
            .padding(.horizontal, 20)
            .padding(.top, 6)
            .padding(.bottom, 20)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - NEW/ALL Toggle

struct NewAllToggle: View {
    @Binding var includeVisited: Bool

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.easeInOut(duration: 0.18)) { includeVisited.toggle() }
        } label: {
            VStack(spacing: 6) {
                HStack(spacing: 0) {
                    Text("NEW")
                        .frame(width: 46)
                        .opacity(includeVisited ? 0.32 : 0.9)
                        .fontWeight(includeVisited ? .regular : .bold)
                    // Separator
                    Rectangle()
                        .fill(Color.primary.opacity(0.18))
                        .frame(width: 1, height: 12)
                        .padding(.horizontal, 2)
                    Text("ALL")
                        .frame(width: 46)
                        .opacity(includeVisited ? 0.9 : 0.32)
                        .fontWeight(includeVisited ? .bold : .regular)
                }
                .font(.system(size: 13, weight: .semibold))
                .kerning(2.5)
                .foregroundStyle(.primary)

                // Sliding underline
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.primary.opacity(0.12))
                        .frame(width: 96, height: 2)
                    Rectangle()
                        .fill(Color.primary.opacity(0.85))
                        .frame(width: 48, height: 2)
                        .offset(x: includeVisited ? 48 : 0)
                        .animation(.easeInOut(duration: 0.18), value: includeVisited)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    WalkStartView()
        .environment(AppState())
        .environment(LocationService())
}
