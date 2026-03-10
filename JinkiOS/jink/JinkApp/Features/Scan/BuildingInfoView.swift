import SwiftUI
import Auth
import Supabase

// MARK: - ViewModel

@Observable
final class BuildingInfoViewModel {
    var building: Building? = nil
    var isLoading = false
    var errorMessage: String? = nil
    var isLiked = false
    var isDisliked = false

    func load(bin: String? = nil, name: String? = nil, latitude: Double? = nil, longitude: Double? = nil) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let tables = ["buildings_full_merge", "buildings_full_merge_scanning"]
        let selectFieldsWithAesthetic = "bin, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic, aesthetic_profile"
        let selectFieldsBasic = "bin, building_name, address, architect, year_built, style, storytelling, landmark, mat_prim, building_type, geocoded_lat, geocoded_lng, primary_aesthetic, secondary_aesthetic"

        for table in tables {
            do {
                let fieldOptions = [selectFieldsWithAesthetic, selectFieldsBasic]
                
                for fields in fieldOptions {
                    do {
                        // Priority 1: BIN lookup
                        if let bin, !bin.isEmpty, bin != "unknown" {
                            let binStr = bin.replacingOccurrences(of: ".0", with: "")
                            let results: [Building] = try await withTimeout(seconds: 5) {
                                try await SupabaseService.shared.buildingsClient
                                    .from(table)
                                    .select(fields)
                                    .or("bin.eq.\(binStr),bin.eq.\(binStr).0")
                                    .limit(1)
                                    .execute()
                                    .value
                            }
                            if let first = results.first {
                                self.building = first
                                return
                            }
                        }

                        // Priority 2: GPS lookup
                        if let lat = latitude, let lng = longitude {
                            let results: [Building] = try await withTimeout(seconds: 5) {
                                try await SupabaseService.shared.buildingsClient
                                    .from(table)
                                    .select(fields)
                                    .gte("geocoded_lat", value: lat - 0.0005)
                                    .lte("geocoded_lat", value: lat + 0.0005)
                                    .gte("geocoded_lng", value: lng - 0.0005)
                                    .lte("geocoded_lng", value: lng + 0.0005)
                                    .limit(1)
                                    .execute()
                                    .value
                            }
                            if let first = results.first {
                                self.building = first
                                return
                            }
                        }

                        // Priority 3: Name lookup
                        if let name, !name.isEmpty {
                            let results: [Building] = try await withTimeout(seconds: 5) {
                                try await SupabaseService.shared.buildingsClient
                                    .from(table)
                                    .select(fields)
                                    .ilike("building_name", pattern: name)
                                    .limit(1)
                                    .execute()
                                    .value
                            }
                            if let first = results.first {
                                self.building = first
                                return
                            }
                        }
                    } catch {
                        print("[BuildingInfoViewModel] Fields failed for table \(table): \(error.localizedDescription)")
                        if fields == selectFieldsBasic { throw error }
                    }
                }
            } catch {
                print("[BuildingInfoViewModel] Table \(table) failed: \(error.localizedDescription)")
            }
        }

        errorMessage = "Building data unavailable"
    }

    private func withTimeout<T>(seconds: TimeInterval, operation: @escaping @Sendable () async throws -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw URLError(.timedOut)
            }
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
    
    func toggleLike(userId: String) {
        guard !isLiked, let building = building else { return }
        isLiked = true
        isDisliked = false
        sendAestheticEvent(userId: userId, building: building, subtype: "like")
    }
    
    func toggleDislike(userId: String) {
        guard !isDisliked, let building = building else { return }
        isDisliked = true
        isLiked = false
        sendAestheticEvent(userId: userId, building: building, subtype: "dislike")
    }
    
    func recordDwellTime(userId: String, timeSpentSeconds: TimeInterval) {
        guard timeSpentSeconds > 10, let building = building else { return }
        sendAestheticEvent(userId: userId, building: building, subtype: "dwell")
    }
    
    private func sendAestheticEvent(userId: String, building: Building, subtype: String) {
        Task {
            do {
                try await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: building.bin, // using BIN as fallback for BBL in aesthetic profile
                    aestheticVector: building.aestheticProfile,
                    subtype: subtype
                )
                await ProgressService.shared.processScan(userId: userId, building: nil)
            } catch {
                print("[BuildingInfoViewModel] Failed to send aesthetic event: \(error)")
            }
        }
    }
}

// MARK: - View

struct BuildingInfoView: View {
    let bin: String
    let name: String
    let address: String
    var latitude: Double? = nil
    var longitude: Double? = nil
    var fromScan: Bool = false

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var vm = BuildingInfoViewModel()
    @State private var showAddToList = false
    @State private var showListings = false
    @State private var showSimilar = false
    @State private var scrollOffset: CGFloat = 0

    @State private var viewStartTime: Date? = nil

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: 0) {
                    // Top Image Section
                    imageSection
                        .background(GeometryReader { geo in
                            Color.clear.preference(key: ScrollOffsetPreferenceKey.self, value: geo.frame(in: .global).minY)
                        })
                    
                    if vm.isLoading {
                        ProgressView()
                            .padding(.top, 40)
                    } else if let building = vm.building {
                        buildingContent(building)
                    } else {
                        fallbackContent
                    }
                }
                .padding(.bottom, 40)
            }
            .ignoresSafeArea(edges: .top)
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
                scrollOffset = value
            }
            
            // Custom Header Overlay
            headerOverlay
                .opacity(headerOpacity)
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showAddToList) {
            AddToListSheet(bin: vm.building?.bin ?? bin, buildingName: vm.building?.name ?? name, address: vm.building?.address ?? address)
        }
        .sheet(isPresented: $showSimilar) {
            if let aesthetic = vm.building?.primaryAesthetic {
                SimilarBuildingsView(aesthetic: aesthetic)
            }
        }
        .navigationDestination(isPresented: $showListings) {
            BuildingListingsView(buildingBin: vm.building?.bin ?? bin, buildingName: vm.building?.name ?? name)
        }
        .task {
            await vm.load(bin: bin.isEmpty ? nil : bin, name: name, latitude: latitude, longitude: longitude)
        }
        .onAppear {
            viewStartTime = Date()
        }
        .onDisappear {
            if let start = viewStartTime, let userId = appState.currentUser?.id.uuidString {
                let duration = Date().timeIntervalSince(start)
                vm.recordDwellTime(userId: userId, timeSpentSeconds: duration)
            }
        }
    }

    private var headerOpacity: Double {
        let threshold: CGFloat = -100
        if scrollOffset >= 0 { return 1.0 }
        let opacity = 1.0 - (abs(scrollOffset) / abs(threshold))
        return max(0, opacity)
    }

    // MARK: - Subviews

    private var imageSection: some View {
        ZStack {
            let currentBin = vm.building?.bin ?? bin
            let imageUrl = "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(currentBin)/0deg_40pitch.jpg"
            
            AsyncImage(url: URL(string: imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure, .empty:
                    Color.gray.opacity(0.1)
                        .overlay {
                            VStack(spacing: 8) {
                                Image(systemName: "building.columns.fill")
                                    .font(.system(size: 40))
                                    .foregroundStyle(.secondary)
                                Text("No image available")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                        }
                @unknown default:
                    EmptyView()
                }
            }
        }
        .frame(height: 300)
        .clipped()
    }

    private var headerOverlay: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.3))
                    .clipShape(Circle())
            }
            
            Spacer()
            
            Menu {
                Button(action: { showSimilar = true }) {
                    Label("Find Similar Buildings", systemImage: "square.on.square")
                }
                Button(action: { openInMaps() }) {
                    Label("Open in Maps", systemImage: "map")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.3))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal)
        .padding(.top, 60)
    }

    private func buildingContent(_ building: Building) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Thumbs Row
            thumbsRow
            
            // Name Banner
            nameBanner(building)
            
            // Info Facts Grid
            factsGrid(building)
            
            // Lore/Info Section
            loreSection(building)
            
            // Archetype Arc
            if let profile = building.aestheticProfile {
                VStack(alignment: .leading, spacing: 12) {
                    Text("aesthetic profile")
                        .font(.caption.bold().monospaced())
                        .foregroundStyle(AppColors.accent)
                        .padding(.horizontal)
                        .textCase(.uppercase)
                    
                    ArchetypeArcView(profile: profile)
                        .frame(height: 180)
                }
                .padding(.vertical)
            }
            
            // Listings Teaser
            if !building.bin.isEmpty {
                listingsTeaser(building)
            }
        }
    }

    private var thumbsRow: some View {
        HStack(spacing: 20) {
            Spacer()
            Button(action: {
                if let userId = appState.currentUser?.id.uuidString {
                    vm.toggleLike(userId: userId)
                }
            }) {
                Image(systemName: vm.isLiked ? "hand.thumbsup.fill" : "hand.thumbsup")
                    .font(.title2)
                    .foregroundStyle(vm.isLiked ? .white : AppColors.success)
                    .frame(width: 56, height: 56)
                    .background(vm.isLiked ? AppColors.success : Color(uiColor: .secondarySystemBackground))
                    .overlay(Circle().stroke(AppColors.success, lineWidth: 2))
                    .clipShape(Circle())
            }
            
            Button(action: {
                if let userId = appState.currentUser?.id.uuidString {
                    vm.toggleDislike(userId: userId)
                }
            }) {
                Image(systemName: vm.isDisliked ? "hand.thumbsdown.fill" : "hand.thumbsdown")
                    .font(.title2)
                    .foregroundStyle(vm.isDisliked ? .white : AppColors.error)
                    .frame(width: 56, height: 56)
                    .background(vm.isDisliked ? AppColors.error : Color(uiColor: .secondarySystemBackground))
                    .overlay(Circle().stroke(AppColors.error, lineWidth: 2))
                    .clipShape(Circle())
            }
            Spacer()
        }
        .padding(.vertical, 16)
        .tacticalBorder(width: 1, edges: [.bottom], color: Color(uiColor: .separator))
    }

    private func nameBanner(_ building: Building) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "location.fill")
                .font(.caption)
                .foregroundStyle(AppColors.accent)
            
            Text(building.name ?? "Unknown Building")
                .font(.system(.body, design: .monospaced).bold())
                .foregroundStyle(AppColors.accent)
                .textCase(.uppercase)
                .lineLimit(1)
            
            if fromScan {
                Text("+50 XP")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(AppColors.accent, in: Capsule())
            }
            
            Spacer()
            
            HStack(spacing: 10) {
                Button(action: { /* Contribute photo */ }) {
                    Image(systemName: "camera")
                        .font(.system(size: 14))
                        .foregroundStyle(.primary)
                        .frame(width: 32, height: 32)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Circle())
                }
                
                Button(action: { showAddToList = true }) {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 14))
                        .foregroundStyle(.primary)
                        .frame(width: 32, height: 32)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 14)
        .tacticalBorder(width: 1, edges: [.bottom], color: Color(uiColor: .separator))
    }

    private func factsGrid(_ building: Building) -> some View {
        VStack(spacing: 12) {
            factRow(icon: "hammer.fill", label: "Architect", value: building.architect)
            factRow(icon: "paintpalette.fill", label: "Style", value: building.style)
            factRow(icon: "shippingbox.fill", label: "Materials", value: building.materials)
            factRow(icon: "building.2.fill", label: "Use", value: building.use)
            factRow(icon: "calendar", label: "Year Built", value: building.yearBuilt)
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .padding(20)
    }

    private func factRow(icon: String, label: String, value: String?) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(AppColors.accent)
                .frame(width: 20)
            
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold).monospaced())
                .foregroundStyle(.secondary)
            
            Spacer()
            
            Text(value ?? "Unknown")
                .font(.system(size: 12, weight: .semibold).monospaced())
                .foregroundStyle(.primary)
                .multilineTextAlignment(.trailing)
        }
    }

    private func loreSection(_ building: Building) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("lore/info")
                .font(.caption.bold().monospaced())
                .foregroundStyle(AppColors.accent)
                .textCase(.uppercase)
            
            HStack(alignment: .top, spacing: 12) {
                Rectangle()
                    .fill(AppColors.accent)
                    .frame(width: 2)
                
                VStack(alignment: .leading, spacing: 8) {
                    let desc = building.description ?? building.landmark
                    let isNumeric = desc?.range(of: "^[0-9\\s\\.\\-]+$", options: .regularExpression) != nil
                    let isValid = desc != nil && !isNumeric && (desc?.count ?? 0) > 5
                    
                    Text(isValid ? desc! : "No historical records found for this building. This building may not be a designated NYC landmark.")
                        .font(.system(.body, design: .monospaced))
                        .lineSpacing(4)
                    
                    if isValid && building.landmark != nil {
                        Text("Source: NYC Landmarks Preservation Commission")
                            .font(.system(size: 10).monospaced())
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                    }
                }
            }
        }
        .padding(20)
        .tacticalBorder(width: 1, edges: [.bottom], color: Color(uiColor: .separator))
    }

    private func listingsTeaser(_ building: Building) -> some View {
        Button(action: { showListings = true }) {
            HStack(spacing: 12) {
                Image(systemName: "house.fill")
                    .foregroundStyle(AppColors.accent)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Real Estate Listings")
                        .font(.caption.bold().monospaced())
                        .foregroundStyle(.primary)
                        .textCase(.uppercase)
                    Text("View active apartments in this building")
                        .font(.system(size: 12).monospaced())
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal, 20)
            .padding(.top, 10)
        }
        .buttonStyle(.plain)
    }

    private var fallbackContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            nameBanner(Building.placeholder(bin: bin, name: name, address: address, latitude: latitude, longitude: longitude))
            
            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
            }
        }
    }

    private func openInMaps() {
        let addr = vm.building?.address ?? address
        let encodedAddress = addr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let urlString = "https://maps.apple.com/?address=\(encodedAddress)"
        if let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Add To List Sheet

struct AddToListSheet: View {
    let bin: String
    let buildingName: String
    let address: String
    @Environment(\.dismiss) private var dismiss
    @State private var vm = ListsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView()
                } else if vm.lists.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "list.bullet")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No lists yet")
                            .foregroundStyle(.secondary)
                        Text("Create a list from the Passport tab first.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(vm.lists) { list in
                        Button(action: { 
                            if !list.isHardcoded {
                                addToList(list)
                            }
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(list.name).font(.subheadline.bold())
                                    Text("\(list.buildings.count) buildings")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                
                                if list.isHardcoded {
                                    Image(systemName: "lock.fill")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                } else {
                                    Image(systemName: "plus.circle")
                                        .foregroundStyle(AppColors.accent)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(list.isHardcoded)
                    }
                }
            }
            .navigationTitle("Add to List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear { vm.load() }
        }
    }

    private func addToList(_ list: DisplayList) {
        let building = StoredBuilding(bin: bin, name: buildingName, address: address)
        vm.addBuilding(building, to: list.id)
        dismiss()
    }
}

// MARK: - Preference Key

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
