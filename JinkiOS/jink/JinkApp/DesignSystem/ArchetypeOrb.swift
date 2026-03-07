import SwiftUI

struct ArchetypeOrb: View {
    let aesthetic: AestheticProfile
    let size: CGFloat = 260
    var showLabels: Bool = true
    @State private var pulse = false

    var topThree: [(name: String, score: Double, color: Color)] {
        aesthetic.all.sorted { $0.score > $1.score }.prefix(3).map { $0 }
    }
    var dominantColor: Color { topThree.first?.color ?? AppColors.accent }
    var orbColors: [Color] {
        var c = topThree.map { $0.color }
        while c.count < 3 { c.append(AppColors.accent) }
        return c
    }

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Very soft ambient glow — barely perceptible
                Circle()
                    .fill(dominantColor.opacity(0.07))
                    .frame(width: size + 40, height: size + 40)
                    .blur(radius: 30)
                    .scaleEffect(pulse ? 1.03 : 0.98)
                    .animation(.easeInOut(duration: 3.5).repeatForever(autoreverses: true), value: pulse)

                // Metal orb
                MetalOrbView(colors: orbColors, dominantColor: dominantColor, size: size)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.18), radius: 16, x: 0, y: 6)
            }
            .frame(width: size + 50, height: size + 50)
            .onAppear { pulse = true }

            // Top 2 archetype labels
            if showLabels {
                VStack(spacing: 6) {
                    ForEach(0..<min(topThree.count, 2), id: \.self) { idx in
                        let arch = topThree[idx]
                        HStack(spacing: 8) {
                            Circle().fill(arch.color).frame(width: 8, height: 8)
                            Text(arch.name).font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            Text(String(format: "%.0f%%", arch.score * 100))
                                .font(.caption.bold()).foregroundStyle(arch.color)
                        }
                    }
                }
                .padding(.horizontal, 24)
            }
        }
    }
}
