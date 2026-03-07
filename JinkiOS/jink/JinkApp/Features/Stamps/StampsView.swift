import SwiftUI
import Auth

struct StampsView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = StampsViewModel()
    @State private var selectedStamp: StampWithDefinition? = nil

    let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
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

// MARK: - Stamp Card

struct StampCard: View {
    let stamp: StampWithDefinition

    var rarityColor: Color {
        switch stamp.rarity {
        case .common: return .gray
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return Color(hex: "#FFD700")
        }
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(rarityColor.opacity(0.15))
                    .frame(width: 52, height: 52)
                Image(systemName: seriesIcon)
                    .font(.title3)
                    .foregroundStyle(rarityColor)
            }

            Text(stamp.title)
                .font(.system(size: 10, weight: .medium))
                .multilineTextAlignment(.center)
                .lineLimit(2)

            Text(stamp.rarity.displayName)
                .font(.system(size: 9))
                .foregroundStyle(rarityColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(rarityColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(rarityColor.opacity(0.3), lineWidth: 1))
    }

    var seriesIcon: String {
        switch stamp.series {
        case "quest": return "flag.fill"
        case "achievement": return "trophy.fill"
        default: return "mappin.circle.fill"
        }
    }
}

// MARK: - Stamp Detail Sheet

struct StampDetailSheet: View {
    let stamp: StampWithDefinition
    @Environment(\.dismiss) private var dismiss

    var rarityColor: Color {
        switch stamp.rarity {
        case .common: return .gray
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return Color(hex: "#FFD700")
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(rarityColor.opacity(0.15))
                            .frame(width: 100, height: 100)
                        Image(systemName: stamp.series == "quest" ? "flag.fill" : stamp.series == "achievement" ? "trophy.fill" : "mappin.circle.fill")
                            .font(.largeTitle)
                            .foregroundStyle(rarityColor)
                    }
                    .padding(.top)

                    VStack(spacing: 8) {
                        Text(stamp.title)
                            .font(.title2.bold())
                            .multilineTextAlignment(.center)

                        Text(stamp.rarity.displayName.uppercased())
                            .font(.caption.bold())
                            .foregroundStyle(rarityColor)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(rarityColor.opacity(0.15))
                            .clipShape(Capsule())
                    }

                    Text(stamp.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    if let earnedAt = stamp.earnedAt {
                        VStack(spacing: 4) {
                            Text("EARNED")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(earnedAt, style: .date)
                                .font(.caption.bold())
                        }
                        .padding()
                        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding()
            }
            .navigationTitle("Stamp Detail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
