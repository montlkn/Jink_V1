import SwiftUI
import CoreLocation
import UIKit
import Auth
import Supabase

// MARK: - WalkNavView

struct WalkNavView: View {
    @Environment(AppState.self) private var appState
    @Bindable var vm: WalkViewModel
    @Environment(\.dismiss) private var dismiss
    var onWalkComplete: (() -> Void)? = nil

    // Verify celebration state
    @State private var flashOpacity: Double = 0
    @State private var xpBumpScale: Double = 1
    @State private var isVerifyCooldown: Bool = false
    
    // New states
    @State private var showVerificationCamera = false
    @State private var showAdHocScan = false

    var body: some View {
        ZStack {
            // Background
            Color(.systemBackground).ignoresSafeArea()

            // Directional glow
            DirectionalGlowView(vm: vm)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            VStack(spacing: 0) {
                NavHeader(vm: vm, onPause: { dismiss() }, xpScale: xpBumpScale)
                    .padding(.horizontal, 20)
                    .padding(.top, 12)

                BuildingCard(vm: vm)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .transition(.move(edge: .leading).combined(with: .opacity))
                    .id(vm.currentBuildingIndex)

                GlassCompass(vm: vm)
                    .frame(width: 320, height: 390)
                    .padding(.top, 12)
                    .frame(maxWidth: .infinity)

                Spacer(minLength: 0)

                NavFooter(vm: vm,
                          isVerifyCooldown: isVerifyCooldown,
                          completeAction: { Task { await completeWalk() } },
                          verifyAction: { showVerificationCamera = true })
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)
            }
            
            // Ad-hoc scan FAB
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button(action: { showAdHocScan = true }) {
                        Image(systemName: "camera.viewfinder")
                            .font(.title2)
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(AppColors.accent, in: Circle())
                            .shadow(color: AppColors.accent.opacity(0.4), radius: 8, x: 0, y: 4)
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 120) // above footer
                }
            }

            // Green flash overlay on verify
            Color.green
                .ignoresSafeArea()
                .opacity(flashOpacity)
                .allowsHitTesting(false)
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .tabBar)
        .fullScreenCover(isPresented: $showVerificationCamera) {
            WalkVerificationCameraView(vm: vm)
        }
        .fullScreenCover(isPresented: $showAdHocScan) {
            ScanView() // Reusing the main scan view for ad-hoc contributions
        }
        .sheet(isPresented: $vm.showInsights) {
            if let detail = vm.verifiedBuildingDetail {
                WalkStopInsightsView(detail: detail, onContinue: {
                    vm.showInsights = false
                    triggerVerifyCelebration() // Trigger visual effects and advance
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
        // Guard: already visited this stop
        if let stop = vm.currentStop, vm.visitedBuildingIds.contains(stop.id) { return }

        vm.visitBuilding()
        isVerifyCooldown = true

        // Flash
        withAnimation(.easeOut(duration: 0.08)) { flashOpacity = 0.18 }
        withAnimation(.easeIn(duration: 0.35).delay(0.08)) { flashOpacity = 0 }
        // XP badge pop
        withAnimation(.spring(response: 0.2, dampingFraction: 0.4)) { xpBumpScale = 1.4 }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6).delay(0.2)) { xpBumpScale = 1 }

        // Reset cooldown after 1.5s
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            isVerifyCooldown = false
        }
    }

    private func completeWalk() async {
        guard let userId = appState.currentUser?.id.uuidString else { return }
        await vm.completeWalk(userId: userId)
    }
}

// MARK: - NavHeader

private struct NavHeader: View {
    let vm: WalkViewModel
    let onPause: () -> Void
    var xpScale: Double = 1

    var body: some View {
        HStack {
            Button(action: onPause) {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left")
                        .font(.caption.bold())
                    Text("PAUSE")
                        .font(.caption.bold())
                        .kerning(1)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.regularMaterial, in: Capsule())
            }
            .foregroundStyle(.primary)

            Spacer()

            HStack(spacing: 8) {
                if vm.walkXP > 0 {
                    Text("+\(vm.walkXP) XP")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(AppColors.accent, in: Capsule())
                        .scaleEffect(xpScale)
                        .transition(.scale.combined(with: .opacity))
                }

                if !vm.buildings.isEmpty {
                    Text("\(vm.currentBuildingIndex + 1) of \(vm.buildings.count)")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(Color.primary, in: Capsule())
                }
            }
            .animation(.spring(duration: 0.3), value: vm.walkXP)
        }
    }
}

// MARK: - BuildingCard

private struct BuildingCard: View {
    let vm: WalkViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top row: name + radar
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Next Stop")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .kerning(1)
                        .textCase(.uppercase)

                    Text(vm.currentStop?.name ?? "Generating your route…")
                        .font(.title3.bold())
                        .lineLimit(2)

                    if let style = vm.currentStop?.style {
                        Text(style.uppercased())
                            .font(.caption2.bold())
                            .foregroundStyle(AppColors.accent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(AppColors.accent.opacity(0.1), in: Capsule())
                    }

                    if let dist = vm.distanceToCurrentStop {
                        let isTooFar = dist > 80_467 // > ~50 miles
                        HStack(spacing: 4) {
                            Image(systemName: isTooFar ? "exclamationmark.triangle.fill" : "location.fill")
                                .font(.caption2)
                            Text(isTooFar ? "Not near route — use for testing" : "\(vm.distanceString) away · \(vm.etaString)")
                                .font(.caption.bold())
                        }
                        .foregroundStyle(isTooFar ? .orange : AppColors.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background((isTooFar ? Color.orange : AppColors.accent).opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke((isTooFar ? Color.orange : AppColors.accent).opacity(0.3), lineWidth: 1))
                    }
                }

                Spacer()

                CardRadar(vm: vm)
                    .frame(width: 72, height: 72)
            }
            .padding(16)

            // Directions block — integrated below the card info
            if vm.bearingToCurrentStop != nil {
                DirectionsBlock(vm: vm)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 14)
            }
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.1), radius: 16, x: 0, y: 8)
    }
}

// MARK: - DirectionsBlock

private struct DirectionsBlock: View {
    let vm: WalkViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Primary direction — big SF Symbol arrow + instruction + distance · time
            HStack(spacing: 10) {
                Image(systemName: directionSFSymbol)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppColors.accent)
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 1) {
                    Text(directionInstruction)
                        .font(.subheadline.bold())
                        .foregroundStyle(.primary)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 6) {
                        Text(vm.distanceString)
                            .font(.caption.bold())
                            .foregroundStyle(AppColors.accent)
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                        Text(vm.etaString)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.accent.opacity(0.07), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(AppColors.accent.opacity(0.18), lineWidth: 1))

            // Secondary hints in a horizontal flow — "then turn" + building side
            HStack(spacing: 8) {
                if let hint = vm.nextDirectionHint {
                    Label(hint, systemImage: turnSFSymbol(for: hint))
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color(.systemGray6), in: Capsule())
                        .lineLimit(1)
                }

                if let side = vm.buildingSideHint {
                    Label(side, systemImage: "building.2.fill")
                        .font(.caption.bold())
                        .foregroundStyle(.green)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(Color.green.opacity(0.1), in: Capsule())
                        .lineLimit(1)
                }
            }
        }
    }

    // SF Symbols directional arrow based on relative bearing
    private var directionSFSymbol: String {
        guard let b = vm.bearingToCurrentStop else { return "arrow.up" }
        var rel = b - vm.userHeading
        while rel < 0 { rel += 360 }
        while rel >= 360 { rel -= 360 }
        switch rel {
        case 337.5...360, 0..<22.5: return "arrow.up"
        case 22.5..<67.5:           return "arrow.up.right"
        case 67.5..<112.5:          return "arrow.right"
        case 112.5..<157.5:         return "arrow.down.right"
        case 157.5..<202.5:         return "arrow.down"
        case 202.5..<247.5:         return "arrow.down.left"
        case 247.5..<292.5:         return "arrow.left"
        case 292.5..<337.5:         return "arrow.up.left"
        default:                    return "arrow.up"
        }
    }

    private var directionInstruction: String {
        guard let b = vm.bearingToCurrentStop else { return "Head toward destination" }
        let cardinals = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"]
        let idx = Int(((b + 22.5) / 45).truncatingRemainder(dividingBy: 8))
        let cardinal = cardinals[max(0, min(7, idx))]
        
        let destName = vm.currentStop?.name ?? "destination"
        if let address = vm.currentStop?.address, !address.isEmpty {
            return "Head \(cardinal) toward \(destName) on \(address)"
        }
        return "Head \(cardinal) toward \(destName)"
    }

    private func turnSFSymbol(for hint: String) -> String {
        hint.lowercased().contains("right") ? "arrow.turn.up.right" : "arrow.turn.up.left"
    }
}

// MARK: - CardRadar (inside the building card)

private struct CardRadar: View {
    let vm: WalkViewModel

    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2 - 1

            // Background
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                     with: .color(.primary.opacity(0.08)))

            // Concentric rings
            for frac in [0.8, 0.5, 0.2] as [CGFloat] {
                let rr = r * frac
                var p = Path()
                p.addEllipse(in: CGRect(x: c.x - rr, y: c.y - rr, width: rr * 2, height: rr * 2))
                ctx.stroke(p, with: .color(.primary.opacity(0.12)), lineWidth: 1)
            }

            // Crosshairs
            ctx.stroke(Path { p in p.move(to: CGPoint(x: c.x - r * 0.8, y: c.y)); p.addLine(to: CGPoint(x: c.x + r * 0.8, y: c.y)) },
                       with: .color(.primary.opacity(0.1)), lineWidth: 1)
            ctx.stroke(Path { p in p.move(to: CGPoint(x: c.x, y: c.y - r * 0.8)); p.addLine(to: CGPoint(x: c.x, y: c.y + r * 0.8)) },
                       with: .color(.primary.opacity(0.1)), lineWidth: 1)

            // Target dot (current stop)
            if let stop = vm.currentStop, let userCoord = vm.currentLocation {
                let dist = haversine(userCoord, stop.coordinate)
                let brng = bearing(from: userCoord, to: stop.coordinate)
                let relBrng = (brng - vm.userHeading).truncatingRemainder(dividingBy: 360)
                let rad = relBrng * .pi / 180
                let scale = CGFloat(min(dist / 200, 0.9))
                let x = c.x + scale * r * 0.8 * CGFloat(sin(rad))
                let y = c.y - scale * r * 0.8 * CGFloat(cos(rad))
                let dotR: CGFloat = 6
                ctx.fill(Path(ellipseIn: CGRect(x: x - dotR, y: y - dotR, width: dotR * 2, height: dotR * 2)),
                         with: .color(Color(red: 1, green: 0.42, blue: 0.42)))
            }

            // User dot
            let ud: CGFloat = 4
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - ud, y: c.y - ud, width: ud * 2, height: ud * 2)),
                     with: .color(.white))
            // Direction triangle above user dot
            ctx.fill(Path { p in
                p.move(to: CGPoint(x: c.x, y: c.y - ud - 6))
                p.addLine(to: CGPoint(x: c.x - 3, y: c.y - ud - 2))
                p.addLine(to: CGPoint(x: c.x + 3, y: c.y - ud - 2))
                p.closeSubpath()
            }, with: .color(.white))

            // Outer ring
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                       with: .color(.primary.opacity(0.25)), lineWidth: 1.5)
        }
        .clipShape(Circle())
    }

    private func haversine(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        let R = 6_371_000.0
        let lat1 = a.latitude * .pi / 180, lat2 = b.latitude * .pi / 180
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let x = sin(dLat/2)*sin(dLat/2) + cos(lat1)*cos(lat2)*sin(dLon/2)*sin(dLon/2)
        return R * 2 * atan2(sqrt(x), sqrt(1 - x))
    }

    private func bearing(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> Double {
        let lat1 = a.latitude * .pi / 180, lat2 = b.latitude * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        return ((atan2(y, x) * 180 / .pi) + 360).truncatingRemainder(dividingBy: 360)
    }
}

// MARK: - GlassCompass (full compass rose with rotating dial)

private struct GlassCompass: View {
    let vm: WalkViewModel

    private var bearing: Double { vm.bearingToCurrentStop ?? 0 }
    private var heading: Double { vm.userHeading }

    private var angleDiff: Double {
        guard vm.bearingToCurrentStop != nil else { return 180 }
        var diff = bearing - heading
        while diff > 180 { diff -= 360 }
        while diff < -180 { diff += 360 }
        return abs(diff)
    }

    private var glowColor: Color {
        let dist = vm.distanceToCurrentStop ?? 1000
        if dist < 30 { return Color(red: 0.4, green: 0.9, blue: 0.5) }
        if angleDiff < 15 { return Color(red: 1, green: 0.27, blue: 0.27) }
        if angleDiff < 40 { return Color(red: 1, green: 0.65, blue: 0.15) }
        if angleDiff < 90 { return Color(red: 0.3, green: 0.75, blue: 1) }
        return Color(red: 0.2, green: 0.4, blue: 0.9)
    }

    // Cardinal/degree label for bearing
    private var bearingLabel: String {
        let b = bearing
        let cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
        let idx = Int(((b + 11.25) / 22.5).truncatingRemainder(dividingBy: 16))
        return "\(Int(b))° \(cardinals[max(0, min(15, idx))])"
    }

    var body: some View {
        VStack(spacing: 10) {
            CompassDial(heading: heading, bearing: bearing, glowColor: glowColor)
                .frame(width: 320, height: 320)

            // Status text block
            VStack(spacing: 3) {
                if vm.bearingToCurrentStop != nil {
                    Text("\(bearingLabel) · \(vm.distanceString)")
                        .font(.system(.subheadline, design: .rounded, weight: .bold))
                        .foregroundStyle(.primary)
                    Text("Heading \(Int(heading))°")
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                    if let name = vm.currentStop?.name {
                        Text("Next: \(name)")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                } else {
                    Text("Calibrating…")
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(height: 60)
        }
    }
}

// MARK: - CompassDial (Canvas-drawn instrument)

private struct CompassDial: View {
    let heading: Double
    let bearing: Double
    var glowColor: Color = .white

    // How much the dial (ticks/labels) rotates
    private var dialRotation: Double { -heading }
    // How much the green target arrow rotates
    private var arrowRotation: Double { bearing - heading }

    var body: some View {
        ZStack {
            // Bezel + face
            CompassFace()

            // Rotating tick ring + north pin
            TickRing()
                .rotationEffect(.degrees(dialRotation))
                .animation(.easeOut(duration: 0.12), value: dialRotation)

            // Green target arrow (rotates to point at destination)
            TargetArrow()
                .rotationEffect(.degrees(arrowRotation))
                .animation(.easeOut(duration: 0.12), value: arrowRotation)

            // Center jewel (fixed) — glows with directional color
            CenterJewel(glowColor: glowColor)
        }
    }
}

// Bezel and glass face (static)
private struct CompassFace: View {
    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2

            // Outer bezel gradient ring
            let bezelPath = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
            ctx.stroke(bezelPath, with: .linearGradient(
                Gradient(colors: [.white.opacity(0.7), Color(white: 0.55, opacity: 0.7)]),
                startPoint: CGPoint(x: c.x - r, y: c.y - r),
                endPoint: CGPoint(x: c.x + r, y: c.y + r)
            ), lineWidth: 3)

            // Glass face fill
            let faceR = r - 3
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - faceR, y: c.y - faceR, width: faceR * 2, height: faceR * 2)),
                     with: .radialGradient(
                        Gradient(colors: [Color(white: 1.0, opacity: 0.18), Color(white: 0.82, opacity: 0.14)]),
                        center: c, startRadius: 0, endRadius: faceR
                     ))

            // Inner face ring
            let innerR = r - 4
            var innerPath = Path()
            innerPath.addEllipse(in: CGRect(x: c.x - innerR, y: c.y - innerR, width: innerR * 2, height: innerR * 2))
            ctx.stroke(innerPath, with: .color(.primary.opacity(0.12)), lineWidth: 1)
        }
    }
}

// Rotating tick ring: 120 ticks + degree labels + cardinals + north pin
private struct TickRing: View {
    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2 - 4

            let majorLen: CGFloat = 14
            let medLen: CGFloat   = 9
            let minLen: CGFloat   = 5
            let labelInset: CGFloat = majorLen + 14
            let cardinals = [0: "N", 90: "E", 180: "S", 270: "W"]

            for i in 0..<120 {
                let deg = Double(i) * 3.0
                let rad = deg * .pi / 180

                let isMajor  = i % 10 == 0  // every 30°
                let isMedium = i % 5 == 0   // every 15°
                let tickLen  = isMajor ? majorLen : (isMedium ? medLen : minLen)
                let opacity  = isMajor ? 0.9  : (isMedium ? 0.65 : 0.35)
                let lineW: CGFloat = isMajor ? 2.0 : (isMedium ? 1.3 : 0.9)

                let x1 = c.x + (r - tickLen) * CGFloat(sin(rad))
                let y1 = c.y - (r - tickLen) * CGFloat(cos(rad))
                let x2 = c.x + r * CGFloat(sin(rad))
                let y2 = c.y - r * CGFloat(cos(rad))

                ctx.stroke(Path { p in
                    p.move(to: CGPoint(x: x1, y: y1))
                    p.addLine(to: CGPoint(x: x2, y: y2))
                }, with: .color(.primary.opacity(opacity)), lineWidth: lineW)

                // Degree labels every 30° (skip cardinals — they get letters)
                if isMajor {
                    let degInt = (i * 3) % 360
                    let lx = c.x + (r - labelInset) * CGFloat(sin(rad))
                    let ly = c.y - (r - labelInset) * CGFloat(cos(rad))

                    if let letter = cardinals[degInt] {
                        let isNorth = degInt == 0
                        let fontSize: CGFloat = isNorth ? 13 : 11
                        let weight: Font.Weight = isNorth ? .black : .bold
                        let color: Color = isNorth ? Color(red: 1, green: 0.42, blue: 0.42) : .primary.opacity(0.75)
                        ctx.draw(
                            Text(letter)
                                .font(.system(size: fontSize, weight: weight, design: .rounded))
                                .foregroundStyle(color),
                            at: CGPoint(x: lx, y: ly)
                        )
                    } else {
                        ctx.draw(
                            Text("\(degInt)")
                                .font(.system(size: 9, weight: .semibold, design: .rounded))
                                .foregroundStyle(Color.primary.opacity(0.6)),
                            at: CGPoint(x: lx, y: ly)
                        )
                    }
                }
            }

            // Red north pin (triangle at rim pointing inward at 0°)
            let pinRad = 0.0
            let pinTipX = c.x + (r - majorLen) * CGFloat(sin(pinRad))
            let pinTipY = c.y - (r - majorLen) * CGFloat(cos(pinRad))
            let pinBaseX1 = c.x + (r - majorLen - 12) * CGFloat(sin(-0.04))
            let pinBaseY1 = c.y - (r - majorLen - 12) * CGFloat(cos(-0.04))
            let pinBaseX2 = c.x + (r - majorLen - 12) * CGFloat(sin(0.04))
            let pinBaseY2 = c.y - (r - majorLen - 12) * CGFloat(cos(0.04))

            let northPinPath = Path { p in
                p.move(to: CGPoint(x: pinTipX, y: pinTipY))
                p.addLine(to: CGPoint(x: pinBaseX1, y: pinBaseY1))
                p.addLine(to: CGPoint(x: pinBaseX2, y: pinBaseY2))
                p.closeSubpath()
            }
            ctx.fill(northPinPath, with: .color(Color(red: 1, green: 0.42, blue: 0.42)))

            // Small red dot outside bezel at north
            let dotX = c.x + (r + 4) * CGFloat(sin(pinRad))
            let dotY = c.y - (r + 4) * CGFloat(cos(pinRad))
            let dotR: CGFloat = 3.5
            ctx.fill(Path(ellipseIn: CGRect(x: dotX - dotR, y: dotY - dotR, width: dotR * 2, height: dotR * 2)),
                     with: .color(Color(red: 1, green: 0.42, blue: 0.42)))
        }
    }
}

// Green target arrow pointing toward destination
private struct TargetArrow: View {
    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2 - 4

            // Arrow geometry: head triangle + rectangular shaft + tail cap
            let headH: CGFloat = 28
            let headW: CGFloat = 16
            let shaftW: CGFloat = 7
            let shaftH: CGFloat = r * 0.55
            let tipY = c.y - r * 0.72         // arrow tip (toward target)
            let headBaseY = tipY + headH
            let shaftTopY = headBaseY
            let shaftBotY = headBaseY + shaftH

            var arrowPath = Path()
            // Triangle head
            arrowPath.move(to: CGPoint(x: c.x, y: tipY))
            arrowPath.addLine(to: CGPoint(x: c.x - headW / 2, y: headBaseY))
            arrowPath.addLine(to: CGPoint(x: c.x + headW / 2, y: headBaseY))
            arrowPath.closeSubpath()
            // Shaft rectangle
            arrowPath.addRoundedRect(
                in: CGRect(x: c.x - shaftW / 2, y: shaftTopY, width: shaftW, height: shaftH),
                cornerSize: CGSize(width: shaftW / 2, height: shaftW / 2)
            )

            ctx.fill(arrowPath, with: .linearGradient(
                Gradient(colors: [
                    Color(red: 0.557, green: 1.0, blue: 0.472, opacity: 0.95),
                    Color(red: 0.557, green: 1.0, blue: 0.472, opacity: 0.3),
                    Color(red: 0.557, green: 1.0, blue: 0.472, opacity: 0.05)
                ]),
                startPoint: CGPoint(x: c.x, y: tipY),
                endPoint: CGPoint(x: c.x, y: shaftBotY)
            ))

            // Tail circle cap
            let capR: CGFloat = shaftW / 2 + 1
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - capR, y: shaftBotY - capR, width: capR * 2, height: capR * 2)),
                     with: .color(Color(red: 0.557, green: 1.0, blue: 0.472, opacity: 0.4)))
        }
    }
}

// Center jewel (static, always on top) — pulses with directional glow color
private struct CenterJewel: View {
    var glowColor: Color = .white
    @State private var pulse = false

    var body: some View {
        ZStack {
            // Outer glow halo
            Circle()
                .fill(glowColor.opacity(0.35))
                .frame(width: 36, height: 36)
                .blur(radius: 8)
                .scaleEffect(pulse ? 1.3 : 1.0)

            // Mid ring
            Circle()
                .stroke(glowColor.opacity(0.6), lineWidth: 1.5)
                .frame(width: 20, height: 20)

            // Core dot
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white, glowColor.opacity(0.8)],
                        center: .center, startRadius: 0, endRadius: 7
                    )
                )
                .frame(width: 14, height: 14)
                .shadow(color: glowColor.opacity(0.9), radius: 6)
        }
        .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: pulse)
        .animation(.easeOut(duration: 0.5), value: glowColor.description)
        .onAppear { pulse = true }
    }
}

// MARK: - DirectionalGlow (hot/cold ambient)

private struct DirectionalGlowView: View {
    let vm: WalkViewModel

    private var angleDiff: Double {
        guard let bearing = vm.bearingToCurrentStop else { return 180 }
        var diff = bearing - vm.userHeading
        while diff > 180 { diff -= 360 }
        while diff < -180 { diff += 360 }
        return diff
    }

    private var absAngle: Double { abs(angleDiff) }

    private var distanceMeters: Double { vm.distanceToCurrentStop ?? 1000 }

    private var glowColor: Color {
        if distanceMeters < 30 { return Color(red: 0.4, green: 0.9, blue: 0.5) } // arrived / green
        if distanceMeters < 50 && absAngle < 30 { return Color(red: 1, green: 0.27, blue: 0.27) } // very close red
        if absAngle < 15 { return Color(red: 1, green: 0.27, blue: 0.27) } // hot red
        if absAngle < 40 { return Color(red: 1, green: 0.65, blue: 0.15) } // warm orange
        if absAngle < 90 { return Color(red: 0.3, green: 0.75, blue: 1) }  // cool blue
        return Color(red: 0.2, green: 0.4, blue: 0.9)                       // cold deep blue
    }

    private var glowX: CGFloat {
        if absAngle < 90 {
            // Ahead: top with horizontal shift
            let shift = CGFloat(angleDiff / 90) * 150
            return UIScreen.main.bounds.width / 2 + shift - 250
        }
        // Behind: sides
        return angleDiff > 0 ? UIScreen.main.bounds.width - 125 : -375
    }

    private var glowY: CGFloat {
        if absAngle < 90 {
            return -200
        }
        let vertShift = CGFloat((absAngle - 90) / 90) * 200
        return UIScreen.main.bounds.height * 0.2 + vertShift
    }

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation(minimumInterval: 0.05)) { _ in
                ZStack {
                    RadialGradient(
                        colors: [
                            glowColor.opacity(0.7),
                            glowColor.opacity(0.4),
                            glowColor.opacity(0.15),
                            glowColor.opacity(0.05),
                            .clear,
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: 280
                    )
                    .frame(width: 560, height: 560)
                    .offset(x: glowX, y: glowY)
                    .blur(radius: 30)
                    .animation(.easeOut(duration: 0.3), value: glowX)
                    .animation(.easeOut(duration: 0.3), value: glowY)
                    .animation(.easeOut(duration: 0.5), value: glowColor.description)
                }
            }
        }
    }
}

// MARK: - NavFooter

private struct NavFooter: View {
    let vm: WalkViewModel
    var isVerifyCooldown: Bool = false
    let completeAction: () -> Void
    let verifyAction: () -> Void

    private var verifyDisabled: Bool {
        vm.buildings.isEmpty || isVerifyCooldown
    }

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Button(action: verifyAction) {
                    HStack(spacing: 8) {
                        if isVerifyCooldown {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.headline)
                        }
                        Text(isVerifyCooldown ? "Verified!" : "Verify I'm Here")
                            .font(.headline)
                            .kerning(0.5)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        isVerifyCooldown ? Color.green : Color.primary,
                        in: Capsule()
                    )
                    .shadow(color: .black.opacity(0.25), radius: 16, x: 0, y: 8)
                    .animation(.easeOut(duration: 0.2), value: isVerifyCooldown)
                }
                .disabled(verifyDisabled)

                // Skip
                Button {
                    vm.skipBuilding()
                } label: {
                    Text("Skip")
                        .font(.headline)
                        .kerning(0.5)
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            Color(.systemBackground).opacity(0.9),
                            in: Capsule()
                        )
                        .overlay(Capsule().stroke(Color.primary.opacity(0.15), lineWidth: 1))
                }
                .disabled(vm.buildings.isEmpty)
                .frame(maxWidth: UIScreen.main.bounds.width * 0.32)
            }

            // "End Walk Early" — only after visiting at least one building
            if !vm.visitedBuildingIds.isEmpty {
                Button(action: completeAction) {
                    if vm.isCompleting {
                        ProgressView().tint(Color(red: 1, green: 0.27, blue: 0.27))
                    } else {
                        Text("End Walk Early")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color(red: 1, green: 0.27, blue: 0.27))
                    }
                }
                .disabled(vm.isCompleting)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.spring(duration: 0.35), value: vm.visitedBuildingIds.isEmpty)
    }
}

// MARK: - XPSummarySheet

struct XPSummarySheet: View {
    let xpEarned: Int
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(AppColors.accent)
                .symbolRenderingMode(.multicolor)

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
