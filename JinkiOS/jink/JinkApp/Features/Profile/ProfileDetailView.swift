import SwiftUI

// MARK: - Profile Detail View

struct ProfileDetailView: View {
    let profile: Profile
    let aestheticProfile: AestheticProfile
    @Environment(\.dismiss) var dismiss
    @State private var selectedArchetype: ArchetypeInfo? = nil
    @State private var showQuiz = false

    var sortedArchetypes: [(name: String, score: Double, color: Color, bio: String)] {
        let all = aestheticProfile.all
        let sorted = all.sorted { $0.score > $1.score }
        return sorted
    }

    private var summaryText: String {
        guard let dom = sortedArchetypes.first else { return "Your architectural sensibility is taking shape — scan buildings and take the quiz to refine it." }
        return dom.bio
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Orb
                    ArchetypeOrb(aesthetic: aestheticProfile)
                        .padding(.top, 8)

                    // AI Summary (top 3)
                    VStack(alignment: .leading, spacing: 12) {
                        Text("AESTHETIC ESSENCE")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.secondary)
                            .kerning(1.5)
                        
                        Text(summaryText)
                            .font(.system(size: 18, weight: .medium, design: .serif))
                            .lineSpacing(6)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal, 24)

                    // Top 3 archetype cards
                    ForEach(sortedArchetypes.prefix(3).indices, id: \.self) { idx in
                        let arch = sortedArchetypes[idx]
                        let info = ArchetypeInfo.all[arch.name]
                        ArchetypeCardView(
                            name: arch.name,
                            tagline: info?.tagline ?? "",
                            vibes: info?.vibes ?? [],
                            color: arch.color,
                            score: arch.score,
                            bio: arch.bio
                        )
                        .onTapGesture {
                            if let info = info {
                                selectedArchetype = ArchetypeInfo(
                                    name: arch.name, color: arch.color, score: arch.score,
                                    tagline: info.tagline, vibes: info.vibes,
                                    coreConcept: info.coreConcept, coreQualities: info.coreQualities,
                                    movements: info.movements, urbanExpression: info.urbanExpression
                                )
                            }
                        }
                    }

                    // Full list
                    VStack(spacing: 12) {
                        Text("All Archetypes")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        VStack(spacing: 8) {
                            ForEach(sortedArchetypes.indices, id: \.self) { idx in
                                let arch = sortedArchetypes[idx]
                                Button {
                                    if let info = ArchetypeInfo.all[arch.name] {
                                        selectedArchetype = ArchetypeInfo(
                                            name: arch.name, color: arch.color, score: arch.score,
                                            tagline: info.tagline, vibes: info.vibes,
                                            coreConcept: info.coreConcept, coreQualities: info.coreQualities,
                                            movements: info.movements, urbanExpression: info.urbanExpression
                                        )
                                    }
                                } label: {
                                    ArchetypeRowView(name: arch.name, score: arch.score, color: arch.color)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }

                    Divider().padding(.horizontal)

                    // Retake quiz
                    Button {
                        showQuiz = true
                    } label: {
                        Label("Retake Aesthetic Quiz", systemImage: "arrow.counterclockwise")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)
                    .padding(.bottom, 32)
                }
                .padding(.vertical, 16)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(item: $selectedArchetype) { info in
                ArchetypeDetailSheet(info: info)
            }
            .sheet(isPresented: $showQuiz) {
                OnboardingQuizView(isPresented: $showQuiz)
            }
        }
    }
}


