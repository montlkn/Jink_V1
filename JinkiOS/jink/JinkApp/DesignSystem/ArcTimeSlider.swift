import SwiftUI

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
                        if abs(rounded - value) > 40 { return } // prevent massive jumps across the gap
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
