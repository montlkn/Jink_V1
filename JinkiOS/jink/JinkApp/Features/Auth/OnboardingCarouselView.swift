import SwiftUI

// MARK: - Coach mark data

private struct CoachMark {
    let title: String
    let body: String
    let icon: String
    let anchor: Alignment  // where the tooltip appears on screen
    let highlightTab: Int? // 0=scan, 1=walk, 2=passport — dims other tabs
}

private let coachMarks: [CoachMark] = [
    CoachMark(
        title: "Time to Jink 👋",
        body: "Your personal architectural passport. Discover the city built around you.",
        icon: "building.columns.fill",
        anchor: .center,
        highlightTab: nil
    ),
    CoachMark(
        title: "Scan any building",
        body: "Point your camera at a building to reveal its history, style, and secrets.",
        icon: "camera.viewfinder",
        anchor: .bottom,
        highlightTab: 0
    ),
    CoachMark(
        title: "Walk the city",
        body: "Generate personalized routes based on your architectural taste and time.",
        icon: "figure.walk",
        anchor: .bottom,
        highlightTab: 1
    ),
    CoachMark(
        title: "Build your passport",
        body: "Earn stamps, unlock achievements, and map your unique aesthetic profile.",
        icon: "book.closed.fill",
        anchor: .bottom,
        highlightTab: 2
    ),
]

// MARK: - OnboardingCarouselView

struct OnboardingCarouselView: View {
    @Binding var isPresented: Bool
    @Environment(AppState.self) private var appState

    @State private var step = 0
    @State private var tooltipOpacity: CGFloat = 0
    @State private var tooltipOffset: CGFloat = 16
    @State private var showQuiz = false

    private var mark: CoachMark { coachMarks[step] }
    private var isLast: Bool { step == coachMarks.count - 1 }

    var body: some View {
        ZStack {
            // Dim overlay — lighter so app is visible behind
            Color.black.opacity(0.45)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            // Tooltip
            VStack {
                if mark.anchor == .bottom { Spacer() }

                tooltip
                    .opacity(tooltipOpacity)
                    .offset(y: tooltipOffset)
                    .padding(.horizontal, 24)
                    .padding(.bottom, mark.anchor == .bottom ? 120 : 0)

                if mark.anchor != .bottom { Spacer() }
            }
        }
        .ignoresSafeArea()
        .onAppear { animateIn() }
        .fullScreenCover(isPresented: $showQuiz) {
            OnboardingQuizView(isPresented: $isPresented)
                .navigationBarBackButtonHidden(true)
        }
    }

    // MARK: Tooltip card

    private var tooltip: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Icon + title row
            HStack(spacing: 12) {
                Image(systemName: mark.icon)
                    .font(.title2.bold())
                    .foregroundStyle(AppColors.accent)
                    .frame(width: 44, height: 44)
                    .background(AppColors.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 2) {
                    Text(mark.title)
                        .font(.headline.bold())
                    // Step dots
                    HStack(spacing: 5) {
                        ForEach(0..<coachMarks.count, id: \.self) { i in
                            Circle()
                                .fill(i == step ? AppColors.accent : Color(.systemGray4))
                                .frame(width: i == step ? 8 : 6, height: i == step ? 8 : 6)
                                .animation(.spring(duration: 0.3), value: step)
                        }
                    }
                }
                Spacer()
            }

            Text(mark.body)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            // Buttons
            if isLast {
                VStack(spacing: 10) {
                    Button(action: { showQuiz = true }) {
                        HStack(spacing: 6) {
                            Image(systemName: "star.fill")
                                .font(.caption.bold())
                            Text("Find My Aesthetic  +150 XP")
                                .font(.subheadline.bold())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(AppColors.accent, in: Capsule())
                        .foregroundStyle(.white)
                    }

                    Button(action: dismiss) {
                        Text("Skip for now")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                    }
                }
            } else {
                HStack(spacing: 12) {
                    Button(action: dismiss) {
                        Text("Skip")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color(.systemGray5), in: Capsule())
                    }
                    Button(action: advance) {
                        Text("Next")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(AppColors.accent, in: Capsule())
                            .foregroundStyle(.white)
                    }
                }
            }
        }
        .padding(20)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.2), radius: 24, x: 0, y: 8)
    }

    // MARK: Actions

    private func advance() {
        animateOut {
            step += 1
            animateIn()
        }
    }

    private func dismiss() {
        animateOut {
            markOnboardingSeen()
            isPresented = false
        }
    }

    private func animateIn() {
        tooltipOpacity = 0
        tooltipOffset = 16
        withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) {
            tooltipOpacity = 1
            tooltipOffset = 0
        }
    }

    private func animateOut(completion: @escaping () -> Void) {
        withAnimation(.easeIn(duration: 0.18)) {
            tooltipOpacity = 0
            tooltipOffset = -8
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { completion() }
    }

    private func markOnboardingSeen() {
        UserDefaults.standard.set(true, forKey: "onboarding_seen")
    }
}
