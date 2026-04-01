import SwiftUI

/// Victorian-era postage stamp card for the Stamps collection.
/// Inspired by classic British "Postage & Revenue" stamps:
/// perforated border, ornamental inner frame, central medallion with icon, curved arc text.
struct VintageStampCard: View {
    let title: String
    let rarity: StampRarity
    let iconName: String       // SF Symbol name
    let size: CGSize

    // Seeded rotation so same stamp always tilts the same amount
    private var tiltDegrees: Double {
        let seed = title.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        let normalized = Double(seed % 100) / 100.0   // 0.0 – 1.0
        return (normalized - 0.5) * 3.0               // –1.5° to +1.5°
    }

    var body: some View {
        ZStack {
            // Paper background
            paperColor
                .overlay(grainOverlay)

            // Ornamental inner content
            stampContent
        }
        .clipShape(PerforatedStampShape(perforationRadius: size.width < 140 ? 4.0 : 5.5))
        .rotationEffect(.degrees(tiltDegrees))
        .frame(width: size.width, height: size.height)
    }

    // MARK: - Paper & Grain

    private var paperColor: Color {
        switch rarity {
        case .common:    return Color(red: 0.94, green: 0.91, blue: 0.86)
        case .rare:      return Color(red: 0.90, green: 0.92, blue: 0.94)
        case .epic:      return Color(red: 0.92, green: 0.89, blue: 0.94)
        case .legendary: return Color(red: 0.94, green: 0.91, blue: 0.82)
        }
    }

    private var frameColor: Color {
        switch rarity {
        case .common:    return Color(red: 0.545, green: 0.251, blue: 0.286)  // muted red
        case .rare:      return Color(red: 0.290, green: 0.420, blue: 0.541)  // steel blue
        case .epic:      return Color(red: 0.420, green: 0.290, blue: 0.541)  // deep purple
        case .legendary: return Color(red: 0.541, green: 0.478, blue: 0.227)  // rich gold
        }
    }

    private var inkColor: Color {
        Color(red: 0.22, green: 0.28, blue: 0.25)  // Victorian dark gray-green ink
    }

    private var grainOverlay: some View {
        Canvas { context, size in
            var rng = SeededRNG(seed: 42)
            for _ in 0..<Int(size.width * size.height / 18) {
                let x = rng.next() * size.width
                let y = rng.next() * size.height
                let r = rng.next() * 0.7 + 0.3
                context.fill(
                    Path(ellipseIn: CGRect(x: x, y: y, width: r, height: r)),
                    with: .color(.black.opacity(0.055))
                )
            }
        }
    }

    // MARK: - Stamp Content

    private var stampContent: some View {
        let pad = size.width * 0.10
        let innerW = size.width - pad * 2
        let innerH = size.height - pad * 2

        return GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let ip = w * 0.10                 // inner padding
            let iw = w - ip * 2               // inner rect width
            let ih = h - ip * 2               // inner rect height

            ZStack {
                // Ornamental frame rectangle (two nested rects + corner flourishes)
                Canvas { context, size in
                    // Outer border line
                    let outerRect = CGRect(x: ip, y: ip, width: iw, height: ih)
                    context.stroke(
                        Path(outerRect),
                        with: .color(frameColor),
                        lineWidth: size.width < 140 ? 1.2 : 1.8
                    )

                    // Inner border line (slightly inset)
                    let borderInset: CGFloat = size.width < 140 ? 3 : 4
                    let innerRect = outerRect.insetBy(dx: borderInset, dy: borderInset)
                    context.stroke(
                        Path(innerRect),
                        with: .color(frameColor.opacity(0.5)),
                        lineWidth: size.width < 140 ? 0.6 : 0.8
                    )

                    // Corner flourishes — small cross marks at each corner
                    let cornerSize: CGFloat = size.width < 140 ? 4 : 6
                    let corners: [CGPoint] = [
                        CGPoint(x: ip, y: ip),
                        CGPoint(x: ip + iw, y: ip),
                        CGPoint(x: ip, y: ip + ih),
                        CGPoint(x: ip + iw, y: ip + ih)
                    ]
                    for corner in corners {
                        var hLine = Path()
                        hLine.move(to: CGPoint(x: corner.x - cornerSize, y: corner.y))
                        hLine.addLine(to: CGPoint(x: corner.x + cornerSize, y: corner.y))
                        context.stroke(hLine, with: .color(frameColor), lineWidth: 0.8)

                        var vLine = Path()
                        vLine.move(to: CGPoint(x: corner.x, y: corner.y - cornerSize))
                        vLine.addLine(to: CGPoint(x: corner.x, y: corner.y + cornerSize))
                        context.stroke(vLine, with: .color(frameColor), lineWidth: 0.8)
                    }
                }

                // Central medallion
                let medallionSize = iw * 0.52
                ZStack {
                    // Outer circle
                    Circle()
                        .stroke(frameColor, lineWidth: size.width < 140 ? 1.2 : 1.8)
                        .frame(width: medallionSize, height: medallionSize)
                    // Dotted inner ring
                    Circle()
                        .stroke(frameColor.opacity(0.4),
                                style: StrokeStyle(lineWidth: 0.6, dash: [2, 2]))
                        .frame(width: medallionSize - (size.width < 140 ? 5 : 7),
                               height: medallionSize - (size.width < 140 ? 5 : 7))
                    // Icon
                    Image(systemName: iconName)
                        .font(.system(size: medallionSize * 0.38, weight: .medium))
                        .foregroundStyle(inkColor)
                }
                .offset(y: size.width < 140 ? -4 : -6)  // nudge up to make room for bottom text

                // Top arc text (title)
                arcText(
                    text: title.uppercased(),
                    radius: medallionSize * 0.62,
                    fontSize: size.width < 140 ? 5.5 : 7.5,
                    startAngle: -140,
                    endAngle: -40,
                    clockwise: false,
                    offset: CGPoint(x: w / 2, y: h / 2 - (size.width < 140 ? 4 : 6))
                )

                // Bottom arc text (rarity)
                arcText(
                    text: rarity.displayName.uppercased(),
                    radius: medallionSize * 0.62,
                    fontSize: size.width < 140 ? 5.5 : 7.5,
                    startAngle: 40,
                    endAngle: 140,
                    clockwise: false,
                    offset: CGPoint(x: w / 2, y: h / 2 - (size.width < 140 ? 4 : 6))
                )
            }
        }
        .padding(pad)
        .frame(width: size.width, height: size.height)
    }

    /// Renders text along a circular arc using individual rotated characters.
    private func arcText(
        text: String,
        radius: CGFloat,
        fontSize: CGFloat,
        startAngle: Double,
        endAngle: Double,
        clockwise: Bool,
        offset: CGPoint
    ) -> some View {
        let chars = Array(text)
        guard !chars.isEmpty else { return AnyView(EmptyView()) }
        let totalAngle = endAngle - startAngle
        let step = totalAngle / Double(max(chars.count - 1, 1))

        return AnyView(
            ZStack {
                ForEach(Array(chars.enumerated()), id: \.offset) { i, char in
                    let angle = startAngle + step * Double(i)
                    let rad = angle * .pi / 180
                    let x = offset.x + radius * cos(rad)
                    let y = offset.y + radius * sin(rad)
                    Text(String(char))
                        .font(.system(size: fontSize, weight: .semibold, design: .serif))
                        .foregroundStyle(frameColor)
                        .rotationEffect(.degrees(angle + 90))
                        .position(x: x, y: y)
                }
            }
        )
    }
}

// MARK: - Seeded RNG for deterministic grain

private struct SeededRNG {
    private var state: UInt64

    init(seed: UInt64) { state = seed }

    mutating func next() -> CGFloat {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return CGFloat((state >> 33)) / CGFloat(UInt32.max)
    }
}

