import SwiftUI

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
                .frame(width: 280, alignment: .center)
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
