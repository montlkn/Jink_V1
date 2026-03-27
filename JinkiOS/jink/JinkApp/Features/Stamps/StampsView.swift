import SwiftUI
import Auth

struct StampsView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = StampsViewModel()
    @State private var selectedStamp: StampWithDefinition? = nil

    let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if vm.isLoading {
                    Spacer()
                    ProgressView("Loading stamps…")
                    Spacer()
                } else if vm.filteredStamps.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "mappin.circle")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No stamps yet")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(vm.filteredStamps) { stamp in
                                StampCard(stamp: stamp)
                                    .onTapGesture { selectedStamp = stamp }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Stamps")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $selectedStamp) { stamp in
                StampDetailSheet(stamp: stamp)
            }
            .task {
                if let userId = appState.currentUser?.id.uuidString {
                    await vm.load(userId: userId)
                }
            }
        }
    }
}

// MARK: - Stamp Card (grid cell)

struct StampCard: View {
    let stamp: StampWithDefinition

    var body: some View {
        let rarityIdx = StampsViewModel.rarityIndex(for: stamp.rarity)
        let crest = StampsViewModel.crestType(for: stamp.stampSlug)

        ZStack(alignment: .bottom) {
            MetalStampCard(
                rarity: rarityIdx,
                crestType: crest,
                size: CGSize(width: 110, height: 140)
            )
            .frame(width: 110, height: 140)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Text overlay at bottom
            VStack(spacing: 2) {
                Text(stamp.title)
                    .font(.system(size: 9, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.9), radius: 3, x: 0, y: 1)

                Text(stamp.rarity.displayName.uppercased())
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(rarityColor.opacity(0.95))
                    .shadow(color: .black.opacity(0.9), radius: 2, x: 0, y: 1)
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 7)
            .padding(.top, 8)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [.black.opacity(0), .black.opacity(0.65)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
            )
        }
        .frame(maxWidth: .infinity)
    }

    var rarityColor: Color {
        switch stamp.rarity {
        case .common: return Color(white: 0.85)
        case .rare: return Color(red: 0.5, green: 0.75, blue: 1.0)
        case .epic: return Color(red: 0.75, green: 0.5, blue: 1.0)
        case .legendary: return Color(hex: "#FFD700")
        }
    }
}

// MARK: - Stamp Detail Sheet

struct StampDetailSheet: View {
    let stamp: StampWithDefinition
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    var rarityIdx: Int { StampsViewModel.rarityIndex(for: stamp.rarity) }
    var crest: Int { StampsViewModel.crestType(for: stamp.stampSlug) }

    var rarityColor: Color {
        switch stamp.rarity {
        case .common: return Color(white: 0.75)
        case .rare: return Color(red: 0.45, green: 0.70, blue: 1.0)
        case .epic: return Color(red: 0.72, green: 0.45, blue: 1.0)
        case .legendary: return Color(hex: "#FFD700")
        }
    }

    var rarityGradient: LinearGradient {
        switch stamp.rarity {
        case .common:
            return LinearGradient(colors: [Color(white: 0.22), Color(white: 0.13)], startPoint: .top, endPoint: .bottom)
        case .rare:
            return LinearGradient(colors: [Color(red: 0.08, green: 0.14, blue: 0.28), Color(red: 0.04, green: 0.07, blue: 0.16)], startPoint: .top, endPoint: .bottom)
        case .epic:
            return LinearGradient(colors: [Color(red: 0.14, green: 0.06, blue: 0.26), Color(red: 0.07, green: 0.03, blue: 0.14)], startPoint: .top, endPoint: .bottom)
        case .legendary:
            return LinearGradient(colors: [Color(red: 0.22, green: 0.17, blue: 0.04), Color(red: 0.10, green: 0.08, blue: 0.02)], startPoint: .top, endPoint: .bottom)
        }
    }

    var seriesLabel: String {
        switch stamp.series {
        case "building": return "BUILDING STAMP"
        case "quest": return "QUEST REWARD"
        case "achievement": return "ACHIEVEMENT"
        default: return stamp.series.uppercased()
        }
    }

    var seriesIcon: String {
        switch stamp.series {
        case "building": return "building.2.fill"
        case "quest": return "flag.fill"
        case "achievement": return "trophy.fill"
        default: return "star.fill"
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                rarityGradient
                    .ignoresSafeArea()

                // Subtle rarity glow behind shield
                RadialGradient(
                    colors: [rarityColor.opacity(0.15), .clear],
                    center: .init(x: 0.5, y: 0.35),
                    startRadius: 0,
                    endRadius: 260
                )
                .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {

                        // ── Shield ─────────────────────────────────────
                        MetalStampCard(
                            rarity: rarityIdx,
                            crestType: crest,
                            size: CGSize(width: 220, height: 280)
                        )
                        .frame(width: 220, height: 280)
                        .shadow(color: rarityColor.opacity(0.45), radius: 28, x: 0, y: 10)
                        .shadow(color: .black.opacity(0.5), radius: 14, x: 0, y: 6)
                        .padding(.top, 32)
                        .padding(.bottom, 24)

                        // ── Title block ────────────────────────────────
                        VStack(spacing: 6) {
                            // Series type chip
                            Label(seriesLabel, systemImage: seriesIcon)
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundStyle(rarityColor.opacity(0.8))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(rarityColor.opacity(0.12), in: Capsule())
                                .overlay(Capsule().stroke(rarityColor.opacity(0.25), lineWidth: 0.5))

                            Text(stamp.title)
                                .font(.system(size: 26, weight: .bold))
                                .foregroundStyle(.white)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)

                            // Rarity stars
                            HStack(spacing: 4) {
                                ForEach(0..<rarityStarCount, id: \.self) { _ in
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 10))
                                        .foregroundStyle(rarityColor)
                                }
                                Text(stamp.rarity.displayName.uppercased())
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityColor)
                            }
                        }
                        .padding(.bottom, 28)

                        // ── Description card ───────────────────────────
                        VStack(alignment: .leading, spacing: 0) {
                            // Header rule
                            HStack {
                                Rectangle()
                                    .fill(rarityColor.opacity(0.4))
                                    .frame(height: 0.5)
                                Text("DETAILS")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityColor.opacity(0.6))
                                    .fixedSize()
                                Rectangle()
                                    .fill(rarityColor.opacity(0.4))
                                    .frame(height: 0.5)
                            }
                            .padding(.bottom, 16)

                            Text(stamp.description)
                                .font(.system(size: 15, weight: .regular))
                                .foregroundStyle(Color.white.opacity(0.80))
                                .lineSpacing(5)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(20)
                        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(rarityColor.opacity(0.15), lineWidth: 1))
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)

                        // ── Stats row ──────────────────────────────────
                        HStack(spacing: 12) {
                            // Earned date
                            if let earnedAt = stamp.earnedAt {
                                StatPill(
                                    icon: "calendar",
                                    label: "EARNED",
                                    value: earnedAt.formatted(date: .abbreviated, time: .omitted),
                                    accentColor: rarityColor
                                )
                            }

                            // Source type
                            if let source = stamp.userStamp.sourceType, !source.isEmpty {
                                StatPill(
                                    icon: "bolt.fill",
                                    label: "SOURCE",
                                    value: source.replacingOccurrences(of: "_", with: " ").capitalized,
                                    accentColor: rarityColor
                                )
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 28)

                        // ── Rarity lore ────────────────────────────────
                        VStack(spacing: 0) {
                            HStack {
                                Rectangle()
                                    .fill(rarityColor.opacity(0.3))
                                    .frame(height: 0.5)
                                Text("LORE")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityColor.opacity(0.5))
                                    .fixedSize()
                                Rectangle()
                                    .fill(rarityColor.opacity(0.3))
                                    .frame(height: 0.5)
                            }
                            .padding(.bottom, 12)

                            Text(rarityLore)
                                .font(.system(size: 13, weight: .regular, design: .serif))
                                .foregroundStyle(Color.white.opacity(0.45))
                                .italic()
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.clear, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(rarityColor)
                        .fontWeight(.semibold)
                }
            }
        }
    }

    var rarityStarCount: Int {
        switch stamp.rarity {
        case .common: return 1
        case .rare: return 2
        case .epic: return 3
        case .legendary: return 4
        }
    }

    var rarityLore: String {
        switch stamp.rarity {
        case .common:
            return "Every great explorer begins with a single step. This mark recognizes the curiosity that starts a journey."
        case .rare:
            return "Few pause to truly see what stands before them. This seal belongs to those who look beyond the surface."
        case .epic:
            return "Granted only to those who have walked the hidden paths of the city, reading its stones like ancient text."
        case .legendary:
            return "A relic of singular dedication. Those who bear this crest have left their mark on the city's living record."
        }
    }
}

// MARK: - Stat Pill

private struct StatPill: View {
    let icon: String
    let label: String
    let value: String
    let accentColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(label, systemImage: icon)
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(accentColor.opacity(0.6))

            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
                .lineLimit(1)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(accentColor.opacity(0.15), lineWidth: 1))
    }
}
