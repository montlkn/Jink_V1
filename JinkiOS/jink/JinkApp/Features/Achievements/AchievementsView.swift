import SwiftUI
import Auth

struct AchievementsView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = AchievementsViewModel()

    let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView("Loading achievements…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(vm.achievements) { achievement in
                            AchievementFlipCard(achievement: achievement)
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
    }
}

// MARK: - Flip Card

struct AchievementFlipCard: View {
    let achievement: AchievementWithStatus
    @State private var isFlipped = false

    var body: some View {
        ZStack {
            AchievementCardFront(achievement: achievement)
                .opacity(isFlipped ? 0 : 1)
                .rotation3DEffect(.degrees(isFlipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))

            AchievementCardBack(achievement: achievement)
                .opacity(isFlipped ? 1 : 0)
                .rotation3DEffect(.degrees(isFlipped ? 0 : -180), axis: (x: 0, y: 1, z: 0))
        }
        .frame(height: 140)
        .onTapGesture {
            withAnimation(.spring(duration: 0.4)) {
                isFlipped.toggle()
            }
        }
    }
}

// MARK: - Card Front

struct AchievementCardFront: View {
    let achievement: AchievementWithStatus

    var accentColor: Color {
        achievement.isUnlocked ? AppColors.passport.achievement : .gray
    }

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(accentColor.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: achievement.definition.icon)
                    .font(.title2)
                    .foregroundStyle(accentColor)
            }

            Text(achievement.definition.title)
                .font(.caption.bold())
                .multilineTextAlignment(.center)
                .lineLimit(2)

            if !achievement.isUnlocked {
                Text("LOCKED")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(.systemGray5), in: Capsule())
            } else {
                Text("UNLOCKED")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(accentColor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
        .background(accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(accentColor.opacity(0.25), lineWidth: 1))
    }
}

// MARK: - Card Back

struct AchievementCardBack: View {
    let achievement: AchievementWithStatus

    var accentColor: Color {
        achievement.isUnlocked ? AppColors.passport.achievement : .gray
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("+\(achievement.definition.xpReward) XP")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.accent)
                Spacer()
                if achievement.definition.isMissable {
                    Text("MISSABLE")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(.orange)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.15), in: Capsule())
                }
            }

            Text(achievement.definition.description)
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
                .lineLimit(3)

            if let verificationText = achievement.definition.verificationText {
                Text(verificationText)
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
                    .italic()
            }

            if let earnedAt = achievement.earnedAt {
                Spacer()
                Text(earnedAt, style: .date)
                    .font(.system(size: 9))
                    .foregroundStyle(accentColor)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .background(accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(accentColor.opacity(0.25), lineWidth: 1))
    }
}
