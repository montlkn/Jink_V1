import SwiftUI
import Auth

struct PassportView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = PassportViewModel()
    @State private var showProfileDetail = false
    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.profile == nil {
                    ProgressView("Loading passport…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let profile = vm.profile {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Passport Header
                            PassportHeaderView(vm: vm)

                            // Archetype Orb — show default if no profile yet
                            let orbAesthetic = vm.aestheticProfile ?? AestheticProfile.default
                            Button(action: { showProfileDetail = true }) {
                                ArchetypeOrb(aesthetic: orbAesthetic, showLabels: false)
                            }
                            .sheet(isPresented: $showProfileDetail) {
                                ProfileDetailView(profile: profile, aestheticProfile: orbAesthetic)
                            }

                            // Stats Grid: Stamps & Achievements
                            VStack(spacing: 16) {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                    NavigationLink(destination: StampsView()) {
                                        StatCard(value: "\(vm.stampCount)", label: "Stamps", color: AppColors.passport.stamp, icon: "mappin.circle.fill")
                                    }
                                    .buttonStyle(.plain)
                                    NavigationLink(destination: AchievementsView()) {
                                        StatCard(value: "\(vm.achievementCount)", label: "Achievements", color: AppColors.passport.achievement, icon: "trophy.fill")
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal)

                                // Tours & Lists cards
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                    NavigationLink(destination: TourSelectView()) {
                                        FeatureCard(title: "TOURS", subtitle: "GUIDED WALKS", icon: "map.fill")
                                    }
                                    .buttonStyle(.plain)
                                    NavigationLink(destination: ListsView()) {
                                        FeatureCard(title: "LISTS", subtitle: "SAVED BUILDINGS", icon: "list.bullet")
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal)
                            }

                            // Past Jinks
                            if !vm.walkSummaries.isEmpty {
                                VStack(spacing: 12) {
                                    Text("Past Jinks")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.horizontal)

                                    VStack(spacing: 8) {
                                        ForEach(vm.walkSummaries) { walk in
                                            WalkRow(walk: walk)
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            } else {
                                Text("No past walks")
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .center)
                                    .padding()
                            }
                        }
                        .padding(.vertical, 16)
                    }
                } else {
                    VStack(spacing: 12) {
                        Text("No Passport Data")
                            .font(.headline)
                        if let error = vm.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                        Button("Retry") {
                            if let userId = appState.currentUser?.id.uuidString {
                                Task {
                                    await vm.load(userId: userId)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
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

// MARK: - Passport Header
struct PassportHeaderView: View {
    let vm: PassportViewModel

    var body: some View {
        VStack(spacing: 12) {
            // SYS READY indicator
            HStack(spacing: 8) {
                Circle()
                    .fill(AppColors.success)
                    .frame(width: 8, height: 8)
                Text("SYS READY")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.accent)
                Spacer()
            }

            // Passport ID
            if !vm.passportNumber.isEmpty {
                HStack {
                    Text("ID REF")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(vm.passportNumber)
                        .font(.caption.bold())
                        .monospacedDigit()
                    Spacer()
                }
            }

            // Rank
            if let profile = vm.profile, let title = profile.levelTitle, let tier = profile.levelTier {
                HStack {
                    Text("RANK")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(title.uppercased()) • \(tier.uppercased())")
                        .font(.caption.bold())
                    Spacer()
                }
            }

            // Scanned count
            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("SCANNED")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(vm.stampCount)")
                        .font(.caption.bold())
                }
                Spacer()
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [AppColors.accent.opacity(0.1), Color.clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .padding(.horizontal)
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

// MARK: - Feature Card (Tours / Lists)

struct FeatureCard: View {
    let title: String
    let subtitle: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color(hex: "#00AEEF"))
            Spacer()
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(.white)
                .kerning(1.5)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(Color(hex: "#00AEEF").opacity(0.8))
                .kerning(1)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .aspectRatio(186.0 / 110.0, contentMode: .fit)
        .background(Color(hex: "#1a1a2e"))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "#00AEEF").opacity(0.6), lineWidth: 1)
        )
        .cornerRadius(12)
    }
}

// MARK: - Walk Row
struct WalkRow: View {
    let walk: WalkSummary

    var walkDateStr: String {
        guard let date = walk.endedAt else { return "00.00.00" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MM.dd.yy"
        return formatter.string(from: date)
    }

    var walkDurationStr: String {
        guard let start = walk.startedAt, let end = walk.endedAt else { return "00:00" }
        let interval = Int(end.timeIntervalSince(start))
        let hours = interval / 3600
        let minutes = (interval % 3600) / 60
        return String(format: "%02d:%02d", hours, minutes)
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "figure.walk")
                .foregroundStyle(AppColors.passport.walk)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(walkDateStr)
                    .font(.caption.monospaced())
                Text(walkDurationStr)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let type = walk.routeTier {
                Text(type.uppercased())
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
