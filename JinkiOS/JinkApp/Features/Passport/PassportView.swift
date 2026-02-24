import SwiftUI

struct PassportView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = PassportViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.profile == nil {
                    ProgressView("Loading passport…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        // XP Banner
                        if let profile = vm.profile {
                            Section {
                                XPBannerView(profile: profile)
                            }
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }

                        // Stats grid
                        Section("Activity") {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                StatCard(value: "\(vm.stampCount)", label: "Stamps", color: AppColors.passport.stamp, icon: "mappin.circle.fill")
                                StatCard(value: "\(vm.achievementCount)", label: "Achievements", color: AppColors.passport.achievement, icon: "trophy.fill")
                                StatCard(value: "\(vm.visaCount)", label: "Visas", color: AppColors.passport.visa, icon: "ticket.fill")
                            }
                            .padding(.vertical, 8)
                        }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())

                        // Archetype arc
                        if let aesthetic = vm.profile?.aestheticProfile {
                            Section("Aesthetic Profile") {
                                ArchetypeArcView(profile: aesthetic)
                                    .frame(height: 220)
                            }
                            .listRowBackground(Color.clear)
                        }

                        // Recent walks
                        if !vm.walkSummaries.isEmpty {
                            Section("Recent Walks") {
                                ForEach(vm.walkSummaries) { walk in
                                    WalkRow(walk: walk)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Passport")
            .refreshable {
                if let userId = appState.currentUser?.id.uuidString {
                    await vm.load(userId: userId)
                }
            }
        }
        .task {
            if let userId = appState.currentUser?.id.uuidString {
                await vm.load(userId: userId)
            }
        }
    }
}

// MARK: - XP Banner
struct XPBannerView: View {
    let profile: Profile

    var body: some View {
        VStack(spacing: 16) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(profile.xp)")
                    .font(.system(size: 48, weight: .black, design: .rounded))
                    .foregroundStyle(AppColors.accent)
                Text("XP")
                    .font(.title2.bold())
                    .foregroundStyle(AppColors.accent.opacity(0.7))
            }

            HStack {
                VStack(alignment: .leading) {
                    Text("Level \(profile.level)")
                        .font(.headline)
                    if let title = profile.levelTitle {
                        Text(title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if profile.streakCount > 0 {
                    Label("\(profile.streakCount) day streak", systemImage: "flame.fill")
                        .foregroundStyle(AppColors.passport.streak)
                        .font(.callout.bold())
                }
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [AppColors.accent.opacity(0.15), Color.clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let value: String
    let label: String
    let color: Color
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(.title.bold().monospacedDigit())
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Walk Row
struct WalkRow: View {
    let walk: WalkSummary

    var body: some View {
        HStack {
            Image(systemName: "figure.walk")
                .foregroundStyle(AppColors.passport.walk)
            VStack(alignment: .leading, spacing: 2) {
                Text((walk.routeType ?? "Walk").capitalized)
                    .font(.subheadline.weight(.medium))
                if let date = walk.completedAt {
                    Text(date, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let xp = walk.xpEarned {
                Text("+\(xp) XP")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.accent)
            }
        }
    }
}
