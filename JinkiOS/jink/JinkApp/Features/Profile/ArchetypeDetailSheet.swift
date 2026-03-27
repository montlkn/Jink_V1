import SwiftUI

// MARK: - Archetype Detail Sheet

struct ArchetypeDetailSheet: View {
    let info: ArchetypeInfo
    @Environment(\.dismiss) var dismiss

    @State private var personalBio: String? = nil
    @State private var loadingBio = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero header
                    ZStack(alignment: .bottomLeading) {
                        LinearGradient(
                            colors: [info.color, info.color.opacity(0.4)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(info.tagline.uppercased())
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.75))
                                .tracking(2)
                            Text(info.name)
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)
                            Text(String(format: "%.0f%% affinity", info.score * 100))
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.85))
                        }
                        .padding(20)
                    }

                    VStack(spacing: 24) {
                        // Vibe tags
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(info.vibes, id: \.self) { vibe in
                                    Text(vibe)
                                        .font(.caption.bold())
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(info.color.opacity(0.15), in: Capsule())
                                        .foregroundStyle(info.color)
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.top, 20)

                        // Core concept
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Core Concept")
                                .font(.headline)
                            Text(info.coreConcept)
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)

                        // Personal bio (Gemini-generated)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your Profile")
                                .font(.headline)
                            if let bio = personalBio {
                                Text(bio)
                                    .font(.body)
                                    .foregroundStyle(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            } else if loadingBio {
                                HStack(spacing: 8) {
                                    ProgressView().scaleEffect(0.75)
                                    Text("Generating your profile…")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)

                        // Score bar
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your Affinity")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(info.color.opacity(0.2))
                                    Capsule().fill(info.color)
                                        .frame(width: geo.size.width * info.score)
                                }
                                .frame(height: 8)
                            }
                            .frame(height: 8)
                        }
                        .padding(.horizontal)

                        // Core qualities
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Core Qualities")
                                .font(.headline)
                                .padding(.horizontal)
                            ForEach(info.coreQualities.indices, id: \.self) { i in
                                let q = info.coreQualities[i]
                                HStack(alignment: .top, spacing: 12) {
                                    Circle()
                                        .fill(info.color)
                                        .frame(width: 6, height: 6)
                                        .padding(.top, 5)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(q.title).font(.subheadline.bold())
                                        Text(q.description).font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }

                        // Related movements
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Related Movements")
                                .font(.headline)
                                .padding(.horizontal)
                            FlowLayout(spacing: 8) {
                                ForEach(info.movements, id: \.self) { m in
                                    Text(m)
                                        .font(.caption)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color(.secondarySystemBackground), in: Capsule())
                                        .foregroundStyle(.primary)
                                }
                            }
                            .padding(.horizontal)
                        }

                        // Urban expression
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Urban Expression")
                                .font(.headline)
                            Text(info.urbanExpression)
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                        .padding(.bottom, 32)
                    }
                }
            }
            .ignoresSafeArea(edges: .top)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
        }
        .task(id: info.name) {
            guard info.score > 0 else { return }
            loadingBio = true
            let prompt = """
            Write 2 sentences (max 40 words total) describing what it means that someone has \(Int(info.score * 100))% affinity \
            for \(info.name) architecture. Be personal and specific — mention the \(info.vibes.prefix(3).joined(separator: ", ")) qualities \
            they're drawn to. Speak directly to them ("You are drawn to…").
            """
            personalBio = await GeminiService.generate(prompt: prompt, maxTokens: 100, temperature: 0.75)
            loadingBio = false
        }
    }
}
