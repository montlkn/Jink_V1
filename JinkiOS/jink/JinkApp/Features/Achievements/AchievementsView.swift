import SwiftUI
import Auth

struct AchievementsView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = AchievementsViewModel()

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    private static func crestType(for slug: String) -> Int {
        if slug.contains("first") || slug.contains("scan") { return 0 }
        if slug.contains("walk") || slug.contains("travel") { return 6 }
        if slug.contains("streak") || slug.contains("week") { return 3 }
        if slug.contains("style") || slug.contains("explorer") { return 4 }
        if slug.contains("collection") || slug.contains("champion") { return 5 }
        if slug.contains("dawn") { return 7 }
        if slug.contains("milestone") { return 2 }
        return 1
    }

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView("Loading achievements…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if vm.achievements.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "medal")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    Text("No achievements yet")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    Text("Scan buildings and complete walks to earn achievements.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(vm.achievements) { achievement in
                            AchievementShieldCard(
                                achievement: achievement,
                                crestType: AchievementsView.crestType(for: achievement.definition.id)
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Achievements")
        .navigationBarTitleDisplayMode(.inline)
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

// MARK: - Achievement Shield Card

struct AchievementShieldCard: View {
    let achievement: AchievementWithStatus
    let crestType: Int
    @State private var showDetail = false

    private var rarityIndex: Int {
        if !achievement.isUnlocked { return 0 }
        switch achievement.definition.xpReward {
        case 0..<25:  return 0
        case 25..<50: return 1
        case 50..<100: return 2
        default:      return 3
        }
    }

    var body: some View {
        Button { showDetail = true } label: {
            ZStack(alignment: .bottom) {
                MetalStampCard(
                    rarity: rarityIndex,
                    crestType: crestType,
                    size: CGSize(width: 170, height: 210)
                )
                .frame(width: 170, height: 210)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .opacity(achievement.isUnlocked ? 1.0 : 0.38)

                // Bottom label overlay
                VStack(spacing: 3) {
                    Text(achievement.definition.title)
                        .font(.system(size: 11, weight: .bold))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.85), radius: 3, x: 0, y: 1)

                    if achievement.isUnlocked {
                        Text("+\(achievement.definition.xpReward) XP")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(AppColors.accent)
                    } else {
                        Text("LOCKED")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(
                    LinearGradient(colors: [.clear, .black.opacity(0.72)],
                                   startPoint: .top, endPoint: .bottom)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                )
            }
            .frame(width: 170, height: 210)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(achievement.definition.title), \(achievement.isUnlocked ? "unlocked" : "locked")")
        .sheet(isPresented: $showDetail) {
            AchievementDetailSheet(achievement: achievement)
        }
    }
}

// MARK: - Achievement Detail Sheet

struct AchievementDetailSheet: View {
    let achievement: AchievementWithStatus
    @Environment(\.dismiss) private var dismiss

    var accentColor: Color {
        achievement.isUnlocked ? AppColors.passport.achievement : .gray
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Icon circle
                    ZStack {
                        Circle()
                            .fill(accentColor.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Image(systemName: achievement.definition.icon)
                            .font(.system(size: 32))
                            .foregroundStyle(accentColor)
                    }
                    .padding(.top, 24)

                    // Status
                    Text(achievement.isUnlocked ? "UNLOCKED" : "LOCKED")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(accentColor)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(accentColor.opacity(0.12), in: Capsule())

                    // Title
                    Text(achievement.definition.title)
                        .font(.title2.bold())
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    // XP + missable
                    HStack(spacing: 12) {
                        Label("+\(achievement.definition.xpReward) XP", systemImage: "bolt.fill")
                            .font(.caption.bold())
                            .foregroundStyle(AppColors.accent)
                        if achievement.definition.isMissable {
                            Text("MISSABLE")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(.orange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.orange.opacity(0.15), in: Capsule())
                        }
                    }

                    // Description
                    Text(achievement.definition.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    if let verificationText = achievement.definition.verificationText {
                        Text(verificationText)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .italic()
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }

                    if let earnedAt = achievement.earnedAt {
                        Text("Earned \(earnedAt.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption.monospaced())
                            .foregroundStyle(accentColor)
                    }

                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
