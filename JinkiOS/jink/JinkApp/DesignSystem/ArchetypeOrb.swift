import SwiftUI

struct ArchetypeOrb: View {
    let aesthetic: AestheticProfile
    let size: CGFloat
    var tapAction: (() -> Void)? = nil
    var doubleTapAction: (() -> Void)? = nil
    var namespace: Namespace.ID? = nil
    var matchedGeometryId: String? = nil
    @State private var pulse = false
    @State private var orbScale: Double = 1.0
    @State private var isSquishing = false

    init(
        aesthetic: AestheticProfile,
        size: CGFloat = 260,
        tapAction: (() -> Void)? = nil,
        doubleTapAction: (() -> Void)? = nil,
        namespace: Namespace.ID? = nil,
        matchedGeometryId: String? = nil
    ) {
        self.aesthetic = aesthetic
        self.size = size
        self.tapAction = tapAction
        self.doubleTapAction = doubleTapAction
        self.namespace = namespace
        self.matchedGeometryId = matchedGeometryId
    }
    
    // Pre-create haptic generators to avoid first-tap freeze
    private let heavyHaptic = UIImpactFeedbackGenerator(style: .heavy)
    private let lightHaptic = UIImpactFeedbackGenerator(style: .light)

    private func handleTap(action: (() -> Void)?) {
        guard let action, !isSquishing else { return }
        isSquishing = true

        // Stage 1: Heavy thud on squish
        heavyHaptic.impactOccurred()

        // Slow, weighted squish down
        withAnimation(.easeInOut(duration: 0.18)) {
            orbScale = 0.84
        }

        // Stage 2: Ease back with soft overshoot + light click
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
            lightHaptic.impactOccurred()
            withAnimation(.spring(response: 0.55, dampingFraction: 0.5, blendDuration: 0)) {
                orbScale = 1.0
            }
        }

        // Delay action so user sees the full weighted squish cycle
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
            isSquishing = false
            action()
        }
    }

    var topThree: [(name: String, score: Double, color: Color, bio: String)] {
        let all = aesthetic.all
        let sorted = all.sorted { $0.score > $1.score }
        let first3 = Array(sorted.prefix(3))
        return first3
    }
    var dominantColor: Color { topThree.first?.color ?? AppColors.accent }
    var secondaryColor: Color { topThree.count > 1 ? topThree[1].color : AppColors.accent }
    var orbColors: [Color] {
        var c = topThree.map { $0.color }
        while c.count < 3 { c.append(AppColors.accent) }
        return c
    }

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // === MULTI-LAYER EBBING GLOW ===
                // Layer 1: Outermost — large, slow, dominant color
                Circle()
                    .fill(dominantColor.opacity(0.10))
                    .frame(width: size + 80, height: size + 80)
                    .blur(radius: 50)
                    .scaleEffect(pulse ? 1.10 : 0.92)
                    .opacity(pulse ? 0.5 : 0.2)
                    .animation(.easeInOut(duration: 5.0).repeatForever(autoreverses: true), value: pulse)

                // Layer 2: Secondary tint, offset phase
                Circle()
                    .fill(secondaryColor.opacity(0.08))
                    .frame(width: size + 50, height: size + 50)
                    .blur(radius: 35)
                    .scaleEffect(pulse ? 0.96 : 1.06)
                    .opacity(pulse ? 0.35 : 0.55)
                    .animation(.easeInOut(duration: 3.5).repeatForever(autoreverses: true), value: pulse)

                // Layer 3: Mid glow, dominant color, faster rhythm
                Circle()
                    .fill(dominantColor.opacity(0.12))
                    .frame(width: size + 30, height: size + 30)
                    .blur(radius: 25)
                    .scaleEffect(pulse ? 1.05 : 0.97)
                    .opacity(pulse ? 0.6 : 0.3)
                    .animation(.easeInOut(duration: 2.8).repeatForever(autoreverses: true), value: pulse)

                // Layer 4: Tight inner halo
                Circle()
                    .fill(dominantColor.opacity(0.06))
                    .frame(width: size + 10, height: size + 10)
                    .blur(radius: 12)
                    .scaleEffect(pulse ? 1.02 : 0.99)
                    .animation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true), value: pulse)

                // Metal orb
                MetalOrbView(colors: orbColors, dominantColor: dominantColor, size: size)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
                    .shadow(color: dominantColor.opacity(0.15), radius: 20, x: 0, y: 4)
                    .shadow(color: Color.black.opacity(0.12), radius: 10, x: 0, y: 6)
                    .scaleEffect(orbScale)
            }
            .frame(width: size + 80, height: size + 80)
            .modifier(MatchedGeometryModifier(namespace: namespace, id: matchedGeometryId))
            .transition(.asymmetric(
                insertion: .scale(scale: 0.6).combined(with: .opacity),
                removal: .scale(scale: 0.6).combined(with: .opacity)
            ))
            .contentShape(Circle().inset(by: 40))
            .onAppear {
                pulse = true
                // Warm up haptic engines so first tap is instant
                heavyHaptic.prepare()
                lightHaptic.prepare()
            }
            .onTapGesture(count: 2) {
                handleTap(action: doubleTapAction)
            }
            .onTapGesture(count: 1) {
                handleTap(action: tapAction)
            }
        }
    }
}

// MARK: - MatchedGeometryModifier

private struct MatchedGeometryModifier: ViewModifier {
    var namespace: Namespace.ID?
    var id: String?

    func body(content: Content) -> some View {
        if let ns = namespace, let id = id {
            content.matchedGeometryEffect(id: id, in: ns)
        } else {
            content
        }
    }
}
