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
            .refreshable {
                if let userId = appState.currentUser?.id.uuidString {
                    await vm.load(userId: userId)
                }
            }
        }
    }
}

// MARK: - Stamp Card (grid cell) — Vintage Postage Stamp

struct StampCard: View {
    let stamp: StampWithDefinition

    var body: some View {
        VintageStampCard(
            title: stamp.title,
            rarity: stamp.rarity,
            iconName: StampsViewModel.iconName(for: stamp.stampSlug),
            size: CGSize(width: 112, height: 142)
        )
        .frame(maxWidth: .infinity)
        .shadow(color: .black.opacity(0.18), radius: 4, x: 1, y: 2)
    }
}

// MARK: - Stamp Detail Sheet

struct StampDetailSheet: View {
    let stamp: StampWithDefinition
    @Environment(\.dismiss) private var dismiss

    var rarityFrameColor: Color {
        switch stamp.rarity {
        case .common:    return Color(red: 0.545, green: 0.251, blue: 0.286)
        case .rare:      return Color(red: 0.290, green: 0.420, blue: 0.541)
        case .epic:      return Color(red: 0.420, green: 0.290, blue: 0.541)
        case .legendary: return Color(red: 0.541, green: 0.478, blue: 0.227)
        }
    }

    var paperBackground: Color {
        switch stamp.rarity {
        case .common:    return Color(red: 0.94, green: 0.91, blue: 0.86)
        case .rare:      return Color(red: 0.90, green: 0.92, blue: 0.94)
        case .epic:      return Color(red: 0.92, green: 0.89, blue: 0.94)
        case .legendary: return Color(red: 0.94, green: 0.91, blue: 0.82)
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
                // Parchment background
                paperBackground.ignoresSafeArea()

                // Subtle aged paper texture overlay
                Canvas { context, size in
                    var rng = SeededDetailRNG(seed: 99)
                    for _ in 0..<Int(size.width * size.height / 12) {
                        let x = rng.next() * size.width
                        let y = rng.next() * size.height
                        let r = rng.next() * 0.8 + 0.2
                        context.fill(
                            Path(ellipseIn: CGRect(x: x, y: y, width: r, height: r)),
                            with: .color(.black.opacity(0.04))
                        )
                    }
                }
                .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {

                        // ── Large Vintage Stamp ────────────────────────
                        VintageStampCard(
                            title: stamp.title,
                            rarity: stamp.rarity,
                            iconName: StampsViewModel.iconName(for: stamp.stampSlug),
                            size: CGSize(width: 240, height: 300)
                        )
                        .shadow(color: .black.opacity(0.25), radius: 16, x: 2, y: 6)
                        .padding(.top, 40)
                        .padding(.bottom, 32)

                        // ── Title block ────────────────────────────────
                        VStack(spacing: 8) {
                            // Series type chip
                            Label(seriesLabel, systemImage: seriesIcon)
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundStyle(rarityFrameColor.opacity(0.9))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(rarityFrameColor.opacity(0.12), in: Capsule())
                                .overlay(Capsule().stroke(rarityFrameColor.opacity(0.3), lineWidth: 0.5))

                            Text(stamp.title)
                                .font(.system(size: 26, weight: .bold, design: .serif))
                                .foregroundStyle(Color(red: 0.15, green: 0.15, blue: 0.15))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)

                            // Rarity stars
                            HStack(spacing: 4) {
                                ForEach(0..<rarityStarCount, id: \.self) { _ in
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 10))
                                        .foregroundStyle(rarityFrameColor)
                                }
                                Text(stamp.rarity.displayName.uppercased())
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityFrameColor)
                            }
                        }
                        .padding(.bottom, 28)

                        // ── Description card ───────────────────────────
                        VStack(alignment: .leading, spacing: 0) {
                            // Header rule
                            HStack {
                                Rectangle()
                                    .fill(rarityFrameColor.opacity(0.4))
                                    .frame(height: 0.5)
                                Text("DETAILS")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityFrameColor.opacity(0.6))
                                    .fixedSize()
                                Rectangle()
                                    .fill(rarityFrameColor.opacity(0.4))
                                    .frame(height: 0.5)
                            }
                            .padding(.bottom, 16)

                            Text(stamp.description)
                                .font(.system(size: 15, weight: .regular, design: .serif))
                                .foregroundStyle(Color(red: 0.20, green: 0.18, blue: 0.16))
                                .lineSpacing(5)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(20)
                        .background(rarityFrameColor.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(rarityFrameColor.opacity(0.2), lineWidth: 0.8))
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)

                        // ── Stats row ──────────────────────────────────
                        HStack(spacing: 12) {
                            if let earnedAt = stamp.earnedAt {
                                StatPill(
                                    icon: "calendar",
                                    label: "EARNED",
                                    value: earnedAt.formatted(date: .abbreviated, time: .omitted),
                                    accentColor: rarityFrameColor
                                )
                            }
                            if let source = stamp.userStamp.sourceType, !source.isEmpty {
                                StatPill(
                                    icon: "bolt.fill",
                                    label: "SOURCE",
                                    value: source.replacingOccurrences(of: "_", with: " ").capitalized,
                                    accentColor: rarityFrameColor
                                )
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 28)

                        // ── Rarity lore ────────────────────────────────
                        VStack(spacing: 0) {
                            HStack {
                                Rectangle()
                                    .fill(rarityFrameColor.opacity(0.3))
                                    .frame(height: 0.5)
                                Text("LORE")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundStyle(rarityFrameColor.opacity(0.6))
                                    .fixedSize()
                                Rectangle()
                                    .fill(rarityFrameColor.opacity(0.3))
                                    .frame(height: 0.5)
                            }
                            .padding(.bottom, 12)

                            Text(rarityLore)
                                .font(.system(size: 13, weight: .regular, design: .serif))
                                .foregroundStyle(Color(red: 0.25, green: 0.22, blue: 0.18).opacity(0.7))
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
            .toolbarBackground(paperBackground, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(rarityFrameColor)
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

// MARK: - Seeded RNG for detail sheet grain
private struct SeededDetailRNG {
    private var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> CGFloat {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return CGFloat((state >> 33)) / CGFloat(UInt32.max)
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
                .font(.system(size: 13, weight: .semibold, design: .serif))
                .foregroundStyle(Color(red: 0.18, green: 0.15, blue: 0.12))
                .lineLimit(1)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(accentColor.opacity(0.2), lineWidth: 0.8))
    }
}
