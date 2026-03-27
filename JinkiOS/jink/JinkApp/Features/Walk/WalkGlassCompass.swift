import SwiftUI
import CoreLocation
import UIKit

// MARK: - GlassCompass (full compass with integrated hot/cold glass glow)

struct GlassCompass: View {
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

    /// Hot/cold color based on alignment + proximity
    var glowColor: Color {
        let dist = vm.distanceToCurrentStop ?? 1000
        if dist < 30 { return Color(red: 0.4, green: 0.9, blue: 0.5) }   // arrived — green
        if angleDiff < 15 { return Color(red: 1, green: 0.27, blue: 0.27) } // locked on — red
        if angleDiff < 40 { return Color(red: 1, green: 0.65, blue: 0.15) } // warm — orange
        if angleDiff < 90 { return Color(red: 0.3, green: 0.75, blue: 1) }  // cool — blue
        return Color(red: 0.2, green: 0.4, blue: 0.9)                       // cold — deep blue
    }

    /// Glow intensity: stronger when aligned / close
    private var glowIntensity: Double {
        let dist = vm.distanceToCurrentStop ?? 1000
        if dist < 30 { return 0.7 }
        if angleDiff < 15 { return 0.6 }
        if angleDiff < 40 { return 0.45 }
        if angleDiff < 90 { return 0.3 }
        return 0.2
    }

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                // Ambient halo behind the clipped dial (allowed to bleed softly)
                Circle()
                    .fill(glowColor.opacity(glowIntensity * 0.35))
                    .blur(radius: 28)
                    .frame(width: 200, height: 200)

                CompassDial(heading: heading, bearing: bearing, glowColor: glowColor, glowIntensity: glowIntensity)
                    .frame(width: 200, height: 200)
            }
            .frame(width: 200, height: 200)

            // Heading readout below dial
            if vm.bearingToCurrentStop != nil {
                Text("\(Int(heading))° \(headingCardinal)")
                    .font(.system(size: 20, weight: .light, design: .default))
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText())
                    .animation(.linear(duration: 0.1), value: heading)
            } else {
                Text("Calibrating…")
                    .font(.system(size: 16, weight: .light))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var headingCardinal: String {
        let cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
        let idx = Int(((heading + 11.25) / 22.5).truncatingRemainder(dividingBy: 16))
        return cardinals[max(0, min(15, idx))]
    }
}

// MARK: - CompassDial

struct CompassDial: View {
    let heading: Double
    let bearing: Double
    var glowColor: Color = .white
    var glowIntensity: Double = 0.3

    // Accumulated rotations — avoids wrap-around 360° spin
    @State private var dialAccum: Double = 0
    @State private var arrowAccum: Double = 0
    @State private var lastHeading: Double? = nil
    @State private var lastArrow: Double? = nil

    private var rawArrow: Double { bearing - heading }

    var body: some View {
        ZStack {
            // Static background glass orb
            CompassGlassGlow(glowColor: glowColor, glowIntensity: glowIntensity)

            // Rotating dial: tick ring + cardinals
            TickRing(glowColor: glowColor)
                .rotationEffect(.degrees(dialAccum))
                .animation(.interactiveSpring(response: 0.5, dampingFraction: 0.95, blendDuration: 0), value: dialAccum)

            // Fixed north indicator bar at top
            NorthIndicator()

            // Center dot
            Circle()
                .fill(Color.primary.opacity(0.6))
                .frame(width: 6, height: 6)

            // Target needle — rotates independently to bearing
            TargetNeedle()
                .rotationEffect(.degrees(arrowAccum))
                .animation(.interactiveSpring(response: 0.6, dampingFraction: 0.95, blendDuration: 0), value: arrowAccum)
        }
        .clipShape(Circle())
        .onAppear {
            dialAccum = -heading
            arrowAccum = rawArrow
            lastHeading = heading
            lastArrow = rawArrow
        }
        .onChange(of: heading) { _, newHeading in
            let prev = lastHeading ?? newHeading
            var delta = newHeading - prev
            // Normalize delta to [-180, 180] so we always take the short arc
            if delta > 180 { delta -= 360 }
            if delta < -180 { delta += 360 }
            dialAccum -= delta
            lastHeading = newHeading
        }
        .onChange(of: rawArrow) { _, newArrow in
            let prev = lastArrow ?? newArrow
            var delta = newArrow - prev
            if delta > 180 { delta -= 360 }
            if delta < -180 { delta += 360 }
            arrowAccum += delta
            lastArrow = newArrow
        }
    }
}

// MARK: - CompassGlassGlow (MetalOrb-style glass sphere with hot/cold interior)

private struct CompassGlassGlow: View {
    let glowColor: Color
    let glowIntensity: Double
    @State private var pulse = false

    var body: some View {
        ZStack {
            // Dark base — orb interior (MetalOrb style)
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color(white: 0.12),
                            Color(white: 0.06)
                        ],
                        center: .init(x: 0.4, y: 0.38),
                        startRadius: 0,
                        endRadius: 160
                    )
                )

            // Hot/cold color fill inside the orb
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            glowColor.opacity(glowIntensity * 0.5),
                            glowColor.opacity(glowIntensity * 0.15),
                            .clear
                        ],
                        center: .center,
                        startRadius: 20,
                        endRadius: 130
                    )
                )
                .scaleEffect(pulse ? 1.04 : 0.96)
                .animation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true), value: pulse)

            // Specular highlight — top-left bright spot (MetalOrb style)
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [.white.opacity(0.55), .white.opacity(0.0)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 50
                    )
                )
                .frame(width: 110, height: 80)
                .offset(x: -45, y: -60)
                .blur(radius: 8)

            // Rim light
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.25),
                            Color.white.opacity(0.05),
                            glowColor.opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
        }
        .animation(.easeOut(duration: 0.8), value: glowIntensity)
        .onAppear { pulse = true }
    }
}

// MARK: - TickRing (iOS Compass density: tick every 2°, major every 10°, labels every 30°, cardinals inside)

private struct TickRing: View {
    var glowColor: Color = .white

    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2 - 8   // tick outer radius
            let tickInnerR = r - 14                          // inner radius for major ticks area

            // 180 ticks = every 2 degrees
            for i in 0..<180 {
                let deg = Double(i) * 2.0
                let rad = deg * .pi / 180

                let isMajor = i % 5 == 0   // every 10°
                let isCardinal = i % 45 == 0 // every 90° (N/E/S/W)

                let tickLen: CGFloat = isCardinal ? 16 : (isMajor ? 10 : 5)
                let lineW: CGFloat = isCardinal ? 2.0 : (isMajor ? 1.5 : 0.8)
                let opacity: Double = isCardinal ? 0.85 : (isMajor ? 0.6 : 0.25)

                let x1 = c.x + (r - tickLen) * CGFloat(sin(rad))
                let y1 = c.y - (r - tickLen) * CGFloat(cos(rad))
                let x2 = c.x + r * CGFloat(sin(rad))
                let y2 = c.y - r * CGFloat(cos(rad))

                ctx.stroke(Path { p in
                    p.move(to: CGPoint(x: x1, y: y1))
                    p.addLine(to: CGPoint(x: x2, y: y2))
                }, with: .color(.white.opacity(opacity)), lineWidth: lineW)

                // Degree labels every 30° (outside the tick ring slightly)
                if i % 15 == 0 && !isCardinal {
                    let degInt = Int(deg)
                    let labelR = r - 26
                    let lx = c.x + labelR * CGFloat(sin(rad))
                    let ly = c.y - labelR * CGFloat(cos(rad))
                    ctx.draw(
                        Text("\(degInt)").font(.system(size: 9, weight: .medium, design: .monospaced)).foregroundStyle(Color.white.opacity(0.5)),
                        at: CGPoint(x: lx, y: ly)
                    )
                }

                // Cardinal letters inside the face
                if isCardinal {
                    let cardinals = [0: "N", 90: "E", 180: "S", 270: "W"]
                    if let letter = cardinals[Int(deg)] {
                        let labelR = r - 38
                        let lx = c.x + labelR * CGFloat(sin(rad))
                        let ly = c.y - labelR * CGFloat(cos(rad))
                        let isNorth = deg == 0
                        let fontSize: CGFloat = isNorth ? 22 : 17
                        let weight: Font.Weight = isNorth ? .bold : .semibold
                        let color: Color = isNorth ? Color(red: 1, green: 0.2, blue: 0.2) : Color.white.opacity(0.85)
                        ctx.draw(
                            Text(letter).font(.system(size: fontSize, weight: weight, design: .rounded)).foregroundStyle(color),
                            at: CGPoint(x: lx, y: ly)
                        )
                    }
                }
            }

            _ = tickInnerR // suppress unused warning
        }
    }
}

// MARK: - NorthIndicator (fixed white bar at top center, like iOS)

private struct NorthIndicator: View {
    var body: some View {
        VStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.white.opacity(0.9))
                .frame(width: 3, height: 14)
                .shadow(color: .white.opacity(0.6), radius: 4)
            Spacer()
        }
        .padding(.top, 2)
    }
}

// MARK: - TargetNeedle (thin elegant needle pointing to target bearing)

private struct TargetNeedle: View {
    var body: some View {
        Canvas { ctx, size in
            let c = CGPoint(x: size.width / 2, y: size.height / 2)
            let r = min(size.width, size.height) / 2

            // Thin needle line from center to near tip
            let tipY = c.y - r * 0.7
            let stemBottom = c.y + r * 0.2

            var stemPath = Path()
            stemPath.move(to: CGPoint(x: c.x, y: stemBottom))
            stemPath.addLine(to: CGPoint(x: c.x, y: tipY + 12))
            ctx.stroke(stemPath, with: .color(.white.opacity(0.5)), lineWidth: 1.5)

            // Small pointed arrowhead at tip
            let tipW: CGFloat = 8
            var arrowHead = Path()
            arrowHead.move(to: CGPoint(x: c.x, y: tipY))
            arrowHead.addLine(to: CGPoint(x: c.x - tipW / 2, y: tipY + 12))
            arrowHead.addLine(to: CGPoint(x: c.x + tipW / 2, y: tipY + 12))
            arrowHead.closeSubpath()
            ctx.fill(arrowHead, with: .color(.white))

            // Small circle at base
            let dotR: CGFloat = 4
            ctx.fill(
                Path(ellipseIn: CGRect(x: c.x - dotR, y: c.y - dotR, width: dotR*2, height: dotR*2)),
                with: .color(Color.white.opacity(0.7))
            )
        }
    }
}
