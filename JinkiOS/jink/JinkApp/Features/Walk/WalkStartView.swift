import Auth
import Supabase
import SwiftUI
import UIKit

// MARK: - Circular Arc Time Slider

/// 300° arc (starts upper-right at 30°, sweeps clockwise, ends lower-right at -30°)
struct ArcTimeSlider: View {
    @Binding var value: Double          // 5 … 95 minutes
    let min: Double
    let max: Double
    let arcColor: Color
    let onCommit: () -> Void

    private let size: CGFloat = 280
    private let strokeWidth: CGFloat = 20
    private var radius: CGFloat { size / 2 - strokeWidth / 2 - 16 }

    // Arc spans 300°, starts at 30° (upper-right) clockwise
    private let startAngleDeg: Double = 30
    private let arcSpanDeg: Double = 300

    private var thumbAngleDeg: Double {
        let progress = (value - min) / Swift.max(max - min, 1)
        return startAngleDeg + progress * arcSpanDeg
    }

    private func angleToPoint(_ deg: Double) -> CGPoint {
        let rad = (deg - 90) * .pi / 180
        let cx = size / 2, cy = size / 2
        return CGPoint(x: cx + radius * CGFloat(cos(rad)), y: cy + radius * CGFloat(sin(rad)))
    }

    private func arcPath(from startDeg: Double, to endDeg: Double) -> Path {
        Path { p in
            p.addArc(center: CGPoint(x: size / 2, y: size / 2),
                     radius: radius,
                     startAngle: .degrees(startDeg - 90),
                     endAngle: .degrees(endDeg - 90),
                     clockwise: false)
        }
    }

    private func valueFromPoint(_ point: CGPoint) -> Double {
        let cx = size / 2, cy = size / 2
        let dx = Double(point.x - cx), dy = Double(point.y - cy)
        var angleDeg = atan2(dy, dx) * 180 / .pi + 90
        if angleDeg < 0 { angleDeg += 360 }
        var fromStart = angleDeg - startAngleDeg
        if fromStart < 0 { fromStart += 360 }
        if fromStart > arcSpanDeg {
            fromStart = fromStart < (arcSpanDeg + (360 - arcSpanDeg) / 2) ? arcSpanDeg : 0
        }
        let progress = fromStart / arcSpanDeg
        return Swift.min(max, Swift.max(min, min + progress * (max - min)))
    }

    var body: some View {
        let thumbPt = angleToPoint(thumbAngleDeg)

        ZStack {
            arcPath(from: startAngleDeg, to: startAngleDeg + arcSpanDeg)
                .stroke(Color.primary.opacity(0.07), style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round))

            arcPath(from: startAngleDeg, to: thumbAngleDeg)
                .stroke(arcColor, style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round))
                .animation(.easeOut(duration: 0.08), value: thumbAngleDeg)

            Circle()
                .fill(Color.white)
                .frame(width: 26, height: 26)
                .shadow(color: Color.black.opacity(0.18), radius: 4, x: 0, y: 2)
                .position(thumbPt)
        }
        .frame(width: size, height: size)
        .gesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .local)
                .onChanged { g in
                    let newVal = valueFromPoint(g.location)
                    let rounded = newVal.rounded()
                    if rounded != value {
                        UIImpactFeedbackGenerator(style: rounded.truncatingRemainder(dividingBy: 5) == 0 ? .medium : .light).impactOccurred()
                        value = rounded
                    }
                }
                .onEnded { _ in
                    UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                    onCommit()
                }
        )
    }
}

// MARK: - Shimmer Instruction Text

/// Luxe shimmer sweep — dim base text with a bright highlight beam passing left↔right
struct ShimmerInstructionText: View {
    let text: String

    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            // Slow cycle: 3.2s out, 3.2s back
            let cycle = 6.4
            let raw = t.truncatingRemainder(dividingBy: cycle) / cycle
            // Ease in-out oscillation 0 → 1 → 0
            let osc = raw < 0.5 ? raw * 2 : (1 - raw) * 2
            let eased = osc * osc * (3 - 2 * osc)   // smoothstep
            let sweep = CGFloat(eased)

            // Beam half-width: 0.28 on each side of centre
            let lo = sweep - 0.28
            let hi = sweep + 0.28

            Text(text)
                .font(.system(size: 15, weight: .semibold))
                .kerning(2.5)
                .textCase(.uppercase)
                .foregroundStyle(
                    LinearGradient(
                        stops: [
                            .init(color: Color.primary.opacity(0.18), location: Swift.max(0, lo - 0.12)),
                            .init(color: Color.primary.opacity(0.18), location: Swift.max(0, lo)),
                            .init(color: Color.primary.opacity(1.0),  location: sweep),
                            .init(color: Color.primary.opacity(0.18), location: Swift.min(1, hi)),
                            .init(color: Color.primary.opacity(0.18), location: Swift.min(1, hi + 0.12)),
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        }
    }
}

// MARK: - Walk Start View

struct WalkStartView: View {
    @Environment(AppState.self) private var appState
    @Environment(LocationService.self) private var locationService
    @State private var vm: WalkViewModel
    @State private var time: Double = 30
    @State private var includeVisited = false
    @State private var navigateToNav = false
    @State private var showXPDetail = false
    @State private var xp: Int = 0
    @State private var level: Int = 1

    init() {
        _vm = State(initialValue: WalkViewModel(locationService: LocationService()))
    }

    private var xpBonusColor: Color {
        switch time {
        case ..<20: return Color(hex: "#9E9E9E")
        case ..<40: return Color(hex: "#4FC3F7")
        case ..<60: return Color(hex: "#66BB6A")
        case ..<80: return Color(hex: "#FFA726")
        default:    return Color(hex: "#EF5350")
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
                                    .stroke(tierCol, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                                    .frame(width: 54, height: 54)
                                    .rotationEffect(.degrees(-90))
                                // Background ring track
                                Circle()
                                    .stroke(tierCol.opacity(0.15), lineWidth: 3)
                                    .frame(width: 54, height: 54)
                                // Level number
                                VStack(spacing: 0) {
                                    Text("\(level)")
                                        .font(.system(size: 20, weight: .bold, design: .rounded))
                                        .foregroundStyle(Color(.label))
                                }
                            }
                            .frame(width: 56, height: 56)
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        // Map placeholder
                        ZStack {
                            Circle()
                                .fill(Color(.systemGray5))
                                .frame(width: 56, height: 56)
                            Image(systemName: "map.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Color(.systemGray2))
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 16)

                    Spacer()

                    // ── Time row: − number + ── sits ABOVE the arc ──
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
                        ArcTimeSlider(value: $time, min: 5, max: 95, arcColor: xpBonusColor) {
                            Task { await startWalk() }
                        }

                        let aesthetic = AestheticProfile.default
                        ArchetypeOrb(aesthetic: aesthetic, showLabels: false)
                            .scaleEffect(0.72)
                            .onTapGesture {
                                Task { await startWalk() }
                            }
                    }
                    .frame(width: 310, height: 310)

                    Spacer()

                    // ── Footer: shimmer text + NEW/ALL toggle ──
                    VStack(spacing: 22) {
                        ShimmerInstructionText(
                            text: vm.isWalkActive ? "Generating your jink..." : "Press orb to start jink"
                        )

                        NewAllToggle(includeVisited: $includeVisited)
                    }
                    .padding(.bottom, 32)
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
                vm = WalkViewModel(locationService: locationService)
                loadXP()
            }
            .sheet(isPresented: $showXPDetail) {
                XPDetailSheet(xp: xp, level: level)
                    .presentationDetents([.height(160)])
                    .presentationDragIndicator(.hidden)
            }
            .alert("Error", isPresented: .constant(vm.errorMessage != nil)) {
                Button("OK") { vm.errorMessage = nil }
            } message: {
                Text(vm.errorMessage ?? "")
            }
        }
    }

    private func adjustTime(_ delta: Double) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        time = min(95, max(5, time + delta))
    }

    private func startWalk() async {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        let routeType: WalkRouteType = time >= 60 ? .wildcard : time >= 30 ? .aesthetic : .behavioral
        await vm.startWalk(routeType: routeType, userId: userId, durationMinutes: Int(time))
        if vm.isWalkActive { navigateToNav = true }
    }

    private func loadXP() {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        Task {
            do {
                struct XPRow: Decodable { let xp: Int; let level: Int }
                let row: XPRow = try await SupabaseService.shared.client
                    .from("profiles")
                    .select("xp, level")
                    .eq("id", value: userId)
                    .single()
                    .execute()
                    .value
                xp = row.xp
                level = row.level
            } catch {}
        }
    }
}

// MARK: - XP Detail Sheet

struct XPDetailSheet: View {
    let xp: Int
    let level: Int

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
                    Text("\(level)")
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

            // Hint
            HStack {
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
