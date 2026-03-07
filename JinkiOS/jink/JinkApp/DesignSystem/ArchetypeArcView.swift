import SwiftUI

/// Segmented arc showing all 9 archetypes weighted by score
struct ArchetypeArcView: View {
    let profile: AestheticProfile

    var body: some View {
        VStack(spacing: 16) {
            Canvas { ctx, size in
                let center = CGPoint(x: size.width / 2, y: size.height * 0.75)
                let radius = min(size.width, size.height) * 0.6
                let lineWidth: CGFloat = 18
                let startAngle = Angle.degrees(180)
                let totalAngle = 180.0

                let archetypes = profile.all
                let totalScore = archetypes.map(\.score).reduce(0, +)
                let normalizer = totalScore > 0 ? totalScore : 1.0

                var currentAngle = startAngle

                for item in archetypes {
                    let fraction = item.score / normalizer
                    let sweepAngle = Angle.degrees(totalAngle * fraction)

                    let path = Path { p in
                        p.addArc(
                            center: center,
                            radius: radius,
                            startAngle: currentAngle,
                            endAngle: currentAngle + sweepAngle,
                            clockwise: false
                        )
                    }

                    ctx.stroke(
                        path,
                        with: .color(item.color),
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt)
                    )

                    currentAngle += sweepAngle
                }
            }

            // Legend
            let dominant = profile.dominant
            if let d = dominant {
                VStack(spacing: 4) {
                    Text(d.name)
                        .font(.headline)
                        .foregroundStyle(d.color)
                    Text("Dominant Archetype")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Mini legend chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(profile.all, id: \.name) { item in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(item.color)
                                .frame(width: 8, height: 8)
                            Text(item.name)
                                .font(.caption2)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(item.color.opacity(0.1), in: Capsule())
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

#Preview {
    ArchetypeArcView(profile: AestheticProfile(
        classicist: 0.4,
        romantic: 0.1,
        stylist: 0.2,
        modernist: 0.6,
        industrialist: 0.3,
        visionary: 0.5,
        popCulturalist: 0.05,
        vernacularist: 0.15,
        austerist: 0.35
    ))
    .padding()
}
