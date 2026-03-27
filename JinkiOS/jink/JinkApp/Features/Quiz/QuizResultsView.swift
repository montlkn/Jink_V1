import SwiftUI
import Supabase

// MARK: - QuizResultsView

struct QuizResultsView: View {
    @Environment(AppState.self) private var appState
    let isFirstTime: Bool
    var onComplete: () -> Void

    @State private var aestheticProfile: AestheticProfile? = nil
    @State private var isLoading = true

    // Reveal state (center-pinned orb in fixed frame)
    @State private var orbGrayscale: Double = 1.0
    @State private var orbScale: Double = 1.0
    @State private var orbRotation: Double = 0
    @State private var shakeOffset: CGFloat = 0
    @State private var headerVisible = false
    @State private var archetypeOpacity: [Double] = [0, 0, 0]
    @State private var archetypeOffset: [CGFloat] = [24, 24, 24]
    @State private var showCTA = false
    @State private var showXPFlash = false
    @State private var revealStarted = false

    private var top3: [(name: String, score: Double, color: Color, bio: String)] {
        let profile = aestheticProfile ?? AestheticProfile.default
        return Array(profile.all.sorted { $0.score > $1.score }.prefix(3).map { $0 })
    }

    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()

            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Calculating your aesthetic…")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        Text("YOUR AESTHETIC PROFILE")
                            .font(.system(.caption, design: .monospaced, weight: .bold))
                            .foregroundStyle(.secondary)
                            .kerning(2)
                            .opacity(headerVisible ? 1 : 0)
                            .animation(.easeIn(duration: 0.6), value: headerVisible)
                            .padding(.top, 48)
                            .padding(.bottom, 24)

                        // Orb in fixed frame so scale/shake are center-pinned
                        let orb = aestheticProfile ?? AestheticProfile.default
                        ZStack {
                            ArchetypeOrb(aesthetic: orb)
                                .frame(width: 300, height: 300)
                                .offset(x: shakeOffset)
                                .grayscale(orbGrayscale)
                                .scaleEffect(orbScale, anchor: .center)
                                .rotationEffect(.degrees(orbRotation))
                        }
                        .frame(width: 320, height: 320)

                        VStack(spacing: 32) {
                            ForEach(0..<top3.count, id: \.self) { i in
                                ArchetypeRevealRow(archetype: top3[i])
                                    .opacity(archetypeOpacity[i])
                                    .offset(y: archetypeOffset[i])
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 40)
                        .padding(.bottom, 48)

                        if showCTA {
                            Button(action: handleEnter) {
                                Text("ENTER JINK")
                                    .font(.headline.bold())
                                    .kerning(1.5)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .foregroundStyle(.white)
                                    .background(AppColors.accent, in: Capsule())
                            }
                            .padding(.horizontal, 24)
                            .padding(.bottom, 40)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }
                    }
                }
                .animation(.easeOut(duration: 0.4), value: showCTA)
            }

            if showXPFlash { XPFlashView() }
        }
        .navigationBarHidden(true)
        .task {
            guard let userId = appState.currentUser?.id.uuidString else { return }
            await loadProfile(userId: userId)
            if isFirstTime {
                do {
                    try await XPService.shared.awardXP(userId: userId, amount: 100)
                } catch {
                    print("[QuizResultsView] Failed to award XP: \(error)")
                }
            }
            guard !revealStarted else { return }
            revealStarted = true
            await runReveal()
        }
    }

    // MARK: - Reveal sequence

    private func runReveal() async {
        // Grey orb visible for 1.2s
        try? await Task.sleep(for: .seconds(1.2))

        // Single medium haptic, then center-pinned shake (smaller amplitude)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred(intensity: 0.7)
        await shakeOrb()
        try? await Task.sleep(for: .seconds(0.08))
        UIImpactFeedbackGenerator(style: .medium).impactOccurred(intensity: 0.85)
        await shakeOrb()

        // Color reveal over longer duration (not all at once) + spin that speeds up + scale
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        await MainActor.run {
            // Grayscale lifts over 1.8s with easeOut so color “fills in” gradually
            withAnimation(.easeOut(duration: 1.8)) { orbGrayscale = 0 }
            // Rotation 0 → 360° with easeIn so spin speeds up
            withAnimation(.easeIn(duration: 1.6)) { orbRotation = 360 }
            withAnimation(.spring(response: 0.4, dampingFraction: 0.5)) { orbScale = 1.06 }
            headerVisible = true
        }
        try? await Task.sleep(for: .seconds(0.3))
        await MainActor.run {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) { orbScale = 1.0 }
        }

        try? await Task.sleep(for: .seconds(0.5))

        // Staggered archetype rows (top 3)
        for i in 0..<min(top3.count, 3) {
            if i > 0 { UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.6) }
            await MainActor.run {
                withAnimation(.easeOut(duration: 0.45)) {
                    archetypeOpacity[i] = 1.0
                    archetypeOffset[i] = 0
                }
            }
            try? await Task.sleep(for: .seconds(0.22))
        }

        try? await Task.sleep(for: .seconds(0.4))
        await MainActor.run {
            withAnimation(.easeOut(duration: 0.3)) { showCTA = true }
        }
    }

    @MainActor
    private func shakeOrb() async {
        let amp: CGFloat = 5
        withAnimation(.spring(response: 0.25, dampingFraction: 0.4)) {
            shakeOffset = amp
            orbScale = 1.02
        }
        try? await Task.sleep(for: .seconds(0.12))
        withAnimation(.spring(response: 0.25, dampingFraction: 0.4)) {
            shakeOffset = -amp
            orbScale = 0.99
        }
        try? await Task.sleep(for: .seconds(0.12))
        withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) {
            shakeOffset = 0
            orbScale = 1.0
        }
    }

    private func handleEnter() {
        if isFirstTime {
            showXPFlash = true
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                showXPFlash = false
                onComplete()
            }
        } else {
            onComplete()
        }
    }

    private func loadProfile(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        struct AestheticRow: Decodable {
            let normalizedScores: AestheticProfile?
            enum CodingKeys: String, CodingKey { case normalizedScores = "normalized_scores" }
        }
        func fetch() async throws -> AestheticProfile? {
            let row: AestheticRow = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .single()
                .execute()
                .value
            return row.normalizedScores
        }
        do {
            aestheticProfile = try await fetch()
            // RPC may commit just after navigate; retry once after a short delay if missing
            if aestheticProfile == nil {
                try await Task.sleep(for: .seconds(0.6))
                aestheticProfile = try? await fetch()
            }
        } catch {
            print("[QuizResultsView] Failed to load aesthetic profile: \(error)")
        }
    }
}

// MARK: - ArchetypeRevealRow

private struct ArchetypeRevealRow: View {
    let archetype: (name: String, score: Double, color: Color, bio: String)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(archetype.name.uppercased())
                    .font(.system(size: 16, weight: .black))
                    .kerning(1)
                
                Spacer()
                
                Text("\(Int(archetype.score * 100))%")
                    .font(.system(.subheadline, design: .monospaced, weight: .bold))
                    .foregroundStyle(archetype.color)
            }
            
            // Progress line
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color(.systemGray6))
                    Capsule().fill(archetype.color)
                        .frame(width: geo.size.width * archetype.score)
                }
            }
            .frame(height: 4)
            
            Text(archetype.bio)
                .font(.system(size: 15, weight: .medium))
                .lineSpacing(4)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - XPFlashView

private struct XPFlashView: View {
    @State private var flashOpacity: Double = 0.35
    @State private var textScale: Double = 0.4
    @State private var textOpacity: Double = 0
    @State private var textY: CGFloat = 20

    var body: some View {
        ZStack {
            Color.white.opacity(flashOpacity).ignoresSafeArea()
            Text("+100 XP")
                .font(.system(size: 52, weight: .black, design: .rounded))
                .foregroundStyle(AppColors.accent)
                .scaleEffect(textScale)
                .opacity(textOpacity)
                .offset(y: textY)
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: 0.35)) { flashOpacity = 0 }
            withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) {
                textScale = 1.15; textOpacity = 1; textY = 0
            }
            withAnimation(.spring(response: 0.2, dampingFraction: 0.8).delay(0.35)) { textScale = 1.0 }
            withAnimation(.easeIn(duration: 0.35).delay(0.5)) { textOpacity = 0; textY = -80 }
        }
    }
}
