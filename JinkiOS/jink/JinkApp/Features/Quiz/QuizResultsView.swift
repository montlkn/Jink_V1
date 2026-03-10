import SwiftUI
import Supabase

// MARK: - QuizResultsView

struct QuizResultsView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var aestheticProfile: AestheticProfile? = nil
    @State private var isLoading = true

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
                ScrollView {
                    VStack(spacing: 32) {
                        Text("YOUR AESTHETIC PROFILE")
                            .font(.system(.caption, design: .monospaced, weight: .bold))
                            .foregroundStyle(.secondary)
                            .kerning(2)
                            .padding(.top, 32)

                        // Archetype Orb
                        let orb = aestheticProfile ?? AestheticProfile.default
                        ArchetypeOrb(aesthetic: orb, showLabels: true)
                            .frame(height: 260)

                        // XP badge
                        Text("+100 XP")
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(AppColors.accent, in: Capsule())

                        // Top archetypes
                        if let profile = aestheticProfile {
                            let top3 = profile.all.sorted(by: { $0.score > $1.score }).prefix(3)
                            VStack(spacing: 12) {
                                ForEach(Array(top3), id: \.name) { archetype in
                                    HStack {
                                        Text(archetype.name)
                                            .font(.subheadline.bold())
                                        Spacer()
                                        Text("\(Int(archetype.score * 100))%")
                                            .font(.subheadline.bold())
                                            .foregroundStyle(AppColors.accent)
                                    }
                                    .padding(.horizontal, 20)

                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            Capsule().fill(Color(.systemGray5))
                                            Capsule()
                                                .fill(archetype.color)
                                                .frame(width: geo.size.width * archetype.score)
                                        }
                                    }
                                    .frame(height: 6)
                                    .padding(.horizontal, 20)
                                }
                            }
                        }

                        // Enter Jink CTA
                        Button {
                            dismiss()
                        } label: {
                            Text("ENTER JINK")
                                .font(.headline.bold())
                                .kerning(1.5)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .foregroundStyle(.white)
                                .background(AppColors.accent, in: Capsule())
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 32)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .task {
            if let userId = appState.currentUser?.id.uuidString {
                await loadProfile(userId: userId)
            }
        }
    }

    private func loadProfile(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            struct Row: Decodable {
                let normalizedScores: AestheticProfile?
                enum CodingKeys: String, CodingKey {
                    case normalizedScores = "normalized_scores"
                }
            }
            let rows: [Row] = try await SupabaseService.shared.client
                .from("user_aesthetic_profiles")
                .select("normalized_scores")
                .eq("user_id", value: userId)
                .execute()
                .value
            aestheticProfile = rows.first?.normalizedScores
        } catch {
            print("[QuizResultsView] Failed to load aesthetic profile: \(error)")
        }
    }

}
