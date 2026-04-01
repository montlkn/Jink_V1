import SwiftUI
import Auth

struct PassportView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = PassportViewModel()
    @State private var showProfileDetail = false
    @State private var showScannedBuildings = false
    @State private var showStamps = false
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
                            PassportHeaderView(vm: vm, onScanTap: { showScannedBuildings = true })

                            // Archetype Orb — use live profile from AppState, fall back to VM, then default
                            let orbAesthetic = appState.aestheticProfile ?? vm.aestheticProfile ?? AestheticProfile.default
                            ArchetypeOrb(aesthetic: orbAesthetic, tapAction: { showProfileDetail = true })
                                .sheet(isPresented: $showProfileDetail) {
                                    ProfileDetailView(profile: profile, aestheticProfile: orbAesthetic)
                                }

                            // Getting started CTA for new users
                            if vm.scanCount == 0 && vm.walkSummaries.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "building.2.crop.circle")
                                        .font(.system(size: 40))
                                        .foregroundStyle(AppColors.accent)
                                    Text("Welcome to Jink")
                                        .font(.headline)
                                    Text("Scan buildings and take walks to fill your passport. Use the Scan and Walk tabs to get started.")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                }
                                .padding(.horizontal, 32)
                                .padding(.vertical, 16)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                                .padding(.horizontal)
                            }

                            // Stats Grid: Stamps & Achievements
                            VStack(spacing: 16) {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                    Button { showStamps = true } label: {
                                        StatCard(value: "\(vm.stampCount)", label: "Stamps", color: AppColors.passport.stamp, icon: "mappin.circle.fill")
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("\(vm.stampCount) stamps")
                                    .accessibilityHint("View your stamp collection")
                                    NavigationLink(destination: AchievementsView()) {
                                        StatCard(value: "\(vm.achievementCount)", label: "Achievements", color: AppColors.passport.achievement, icon: "trophy.fill")
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("\(vm.achievementCount) achievements")
                                    .accessibilityHint("View your achievements")
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

                        // Sign out + version footer
                        VStack(spacing: 16) {
                            Button(action: {
                                Task { try? await appState.signOut() }
                            }) {
                                Text("Sign Out")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                            }
                            .padding(.horizontal)

                            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
                               let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
                                Text("v\(version) (\(build))")
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .padding(.bottom, 8)
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

            .sheet(isPresented: $showScannedBuildings) {
                    ScannedBuildingsSheet(buildings: vm.scannedBuildings)
                }
            .sheet(isPresented: $showStamps) {
                    StampsView()
                        .environment(appState)
                }
            .refreshable {
                if let userId = appState.currentUser?.id.uuidString {
                    await vm.load(userId: userId)
                }
            }
        }
        .task(id: "\(appState.passportRefreshTrigger)-\(appState.currentUser?.id.uuidString ?? "")") {
            if let userId = appState.currentUser?.id.uuidString {
                await vm.load(userId: userId)
            }
        }
    }
}

// MARK: - Passport Header
struct PassportHeaderView: View {
    let vm: PassportViewModel
    let onScanTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Passport")
                .font(.system(size: 34, weight: .bold))

            HStack(spacing: 16) {
                Button(action: onScanTap) {
                    HStack(spacing: 4) {
                        Text("\(vm.scanCount)")
                            .fontWeight(.semibold)
                        Text("Scanned")
                        Image(systemName: "chevron.right")
                            .font(.caption)
                    }
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)

                if let profile = vm.profile, profile.totalXp > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .font(.caption)
                            .foregroundStyle(AppColors.accent)
                        Text("\(profile.totalXp) XP")
                            .fontWeight(.semibold)
                    }
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
                }

                if let profile = vm.profile, profile.streakCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Text("\(profile.streakCount)")
                            .fontWeight(.semibold)
                    }
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
                }
            }

            // Level indicator — compute from total_xp to avoid stale DB level column
            if let profile = vm.profile {
                let computedLevel = getLevelFromXP(profile.totalXp)
                let levelConfig = getLevelConfig(computedLevel)
                if computedLevel > 1 || profile.levelTitle != nil {
                    HStack(spacing: 6) {
                        Text("LEVEL \(computedLevel)")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(AppColors.accent, in: Capsule())

                        let title = levelConfig.title.isEmpty ? (profile.levelTitle ?? "") : levelConfig.title
                        if !title.isEmpty {
                            Text(title.uppercased())
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 2)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }
}

// MARK: - Scanned Buildings Sheet
struct ScannedBuildingsSheet: View {
    let buildings: [ScannedBuilding]

    var body: some View {
        NavigationStack {
            Group {
                if buildings.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "building.2")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No scanned buildings yet")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(buildings) { building in
                                NavigationLink(destination: BuildingInfoView(bin: building.bin, name: building.displayName, address: building.address ?? "")) {
                                    ScannedBuildingCard(building: building)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }
                }
            }
            .navigationTitle("Scanned Buildings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Scanned Building Card
struct ScannedBuildingCard: View {
    let building: ScannedBuilding

    var body: some View {
        HStack(spacing: 12) {
            // User's scan photo
            AsyncImage(url: URL(string: building.photoUrl ?? "")) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Rectangle().fill(Color(.systemGray5))
                        .overlay(Image(systemName: "building.2").foregroundStyle(.secondary))
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 3) {
                // Line 1: Name or address
                Text(building.displayName)
                    .font(.subheadline.bold())
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                // Line 2: Style · Year
                let detail = [building.style, building.yearBuilt].compactMap { $0 }.joined(separator: " · ")
                if !detail.isEmpty {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else if building.name != nil, let addr = building.address {
                    // If we have a name, show address as secondary info
                    Text(addr)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                // Line 3: Date scanned
                if let date = building.scannedAt {
                    Text("Scanned \(date.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(12)
        .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 12))
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

    var walkTitleStr: String {
        if let borough = walk.borough, !borough.isEmpty {
            return borough.uppercased()
        }
        return "JINK"
    }

    var walkDistanceStr: String? {
        guard let dist = walk.distanceKm else { return nil }
        return String(format: "%.1f km", dist)
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "figure.walk")
                .foregroundStyle(AppColors.passport.walk)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(walkDateStr)
                    .font(.caption.monospaced())
                
                HStack(spacing: 4) {
                    Text(walkDurationStr)
                    if let distStr = walkDistanceStr {
                        Text("·")
                        Text(distStr)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(walkTitleStr)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                
                if let xp = walk.xpEarned {
                    Text("+\(xp) XP")
                        .font(.caption2.bold())
                        .foregroundStyle(AppColors.accent)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
