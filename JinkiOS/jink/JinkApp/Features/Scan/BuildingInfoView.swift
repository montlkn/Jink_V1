import SwiftUI
import Auth



// MARK: - View

struct BuildingInfoView: View {
    let bin: String
    let name: String
    let address: String
    var latitude: Double? = nil
    var longitude: Double? = nil
    var fromScan: Bool = false
    var scanMatch: ScanMatch? = nil

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var vm = BuildingInfoViewModel()
    @State private var showAddToList = false
    @State private var showListings = false
    @State private var showSimilar = false
    @State private var scrollOffset: CGFloat = 0

    @State private var viewStartTime: Date? = nil
    @State private var accumulatedDwellTime: TimeInterval = 0
    @State private var lastForegroundTime: Date? = nil
    @Environment(\.scenePhase) private var scenePhase

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
            AddToListSheet(
                bin: vm.building?.bin ?? bin,
                buildingName: vm.building?.displayName ?? name,
                address: vm.building?.address ?? address,
                aestheticVector: vm.building?.aestheticProfile.map { profile in
                    var dict: [String: Double] = [:]
                    for item in profile.all { dict[item.name.lowercased()] = item.score }
                    return dict
                }
            )
        }
        .sheet(isPresented: $showSimilar) {
            if let aesthetic = vm.building?.primaryAesthetic {
                SimilarBuildingsView(aesthetic: aesthetic)
            }
        }
        .navigationDestination(isPresented: $showListings) {
            BuildingListingsView(buildingBin: vm.building?.bin ?? bin, buildingName: vm.building?.displayName ?? name)
        }
        .task {
            if let match = scanMatch {
                vm.loadFromMatch(match)
            }
            await vm.load(bin: bin.isEmpty ? nil : bin, name: name, latitude: latitude, longitude: longitude)
        }
        .onAppear {
            viewStartTime = Date()
            lastForegroundTime = Date()
        }
        .onDisappear {
            if let last = lastForegroundTime {
                accumulatedDwellTime += Date().timeIntervalSince(last)
            }
            if let userId = appState.currentUser?.id.uuidString {
                vm.recordDwellTime(userId: userId, timeSpentSeconds: accumulatedDwellTime, appState: appState)
            }
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .background, .inactive:
                // Pause: accumulate time spent so far
                if let last = lastForegroundTime {
                    accumulatedDwellTime += Date().timeIntervalSince(last)
                    lastForegroundTime = nil
                }
            case .active:
                // Resume: start counting again
                lastForegroundTime = Date()
            @unknown default:
                break
            }
        }
    }

    // Header is always fully visible — no fading
    private var headerOpacity: Double { 1.0 }

    // MARK: - Subviews

    private var imageSection: some View {
        let currentBin = vm.building?.bin ?? bin
        let imageUrl = "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev/\(currentBin)/0deg_40pitch.jpg"
        let displayBuilding = vm.building

        let heroImageUrl = displayBuilding?.heroImageUrl
        let placeholder = Color.gray.opacity(0.15)
            .overlay {
                VStack(spacing: 8) {
                    Image(systemName: "building.columns.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("No image available")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

        return ZStack(alignment: .bottom) {
            AsyncImage(url: URL(string: imageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    if let heroUrl = heroImageUrl {
                        AsyncImage(url: URL(string: heroUrl)) { heroPhase in
                            if let img = heroPhase.image {
                                img.resizable().aspectRatio(contentMode: .fill)
                            } else if heroPhase.error != nil {
                                placeholder
                            } else {
                                ProgressView()
                            }
                        }
                    } else {
                        placeholder
                    }
                case .empty:
                    ProgressView()
                @unknown default:
                    EmptyView()
                }
            }

            // Gradient overlay + name/year
            LinearGradient(
                colors: [.clear, .black.opacity(0.3), .black.opacity(0.75)],
                startPoint: .center,
                endPoint: .bottom
            )

            // Building name + year overlaid at bottom of image
            if let building = displayBuilding {
                VStack(alignment: .leading, spacing: 4) {
                    if fromScan {
                        Text("+50 XP")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(AppColors.accent, in: Capsule())
                    }
                    Text(building.displayName)
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.5), radius: 4)
                    if let year = building.yearBuilt, !year.isEmpty {
                        let cleanYear = year.replacingOccurrences(of: ".0", with: "")
                        Text("Est. \(cleanYear)")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
        }
        .frame(height: 380)
        .clipped()
    }

    private var headerOverlay: some View {
        HStack(spacing: 10) {
            // Back button
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.35))
                    .clipShape(Circle())
            }

            Spacer()

            // Thumbs — always visible, top-right
            Button(action: {
                if let userId = appState.currentUser?.id.uuidString { vm.toggleLike(userId: userId, appState: appState) }
            }) {
                Image(systemName: vm.isLiked ? "hand.thumbsup.fill" : "hand.thumbsup")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(vm.isLiked ? AppColors.success : .white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.35))
                    .clipShape(Circle())
            }

            Button(action: {
                if let userId = appState.currentUser?.id.uuidString { vm.toggleDislike(userId: userId, appState: appState) }
            }) {
                Image(systemName: vm.isDisliked ? "hand.thumbsdown.fill" : "hand.thumbsdown")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(vm.isDisliked ? AppColors.error : .white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.35))
                    .clipShape(Circle())
            }

            // More menu
            Menu {
                Button(action: { showSimilar = true }) {
                    Label("Find Similar Buildings", systemImage: "square.on.square")
                }
                Button(action: { openInMaps() }) {
                    Label("Open in Maps", systemImage: "map")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.black.opacity(0.35))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 56)
    }

    private func buildingContent(_ building: Building) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Name banner — add-to-list button
            nameBanner(building)

            // Facts chips
            factsGrid(building)

            // Lore section
            loreSection(building)

            // Aesthetic Arc
            VStack(alignment: .leading, spacing: 12) {
                Text("Aesthetic Profile")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.accent)
                    .textCase(.uppercase)
                    .padding(.horizontal)

                if let primaryAesthetic = building.primaryAesthetic, !primaryAesthetic.isEmpty {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(AppColors.archetypeColor(for: primaryAesthetic))
                            .frame(width: 10, height: 10)
                        Text(primaryAesthetic.capitalized)
                            .font(.subheadline.bold())
                            .foregroundStyle(.primary)
                    }
                    .padding(.horizontal)
                }

                if let profile = building.aestheticProfile {
                    ArchetypeArcView(profile: profile)
                        .frame(maxWidth: .infinity)
                        .frame(height: 180)
                } else {
                    Text("Aesthetic profile not available for this building.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)
                        .padding(.vertical, 20)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical)

            // Archival Photos
            if let bbl = building.bbl, !bbl.isEmpty {
                ArchivalPhotoSection(bbl: bbl)
                    .padding(.horizontal)
                    .padding(.bottom, 20)
            }

            // Listings Teaser
            if !building.bin.isEmpty {
                listingsTeaser(building)
            }
        }
    }

    private func nameBanner(_ building: Building) -> some View {
        HStack {
            Text(building.address ?? "")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Spacer()
            Button { showAddToList = true } label: {
                Label("Save", systemImage: "list.bullet.below.rectangle")
                    .font(.caption.bold())
                    .foregroundStyle(AppColors.accent)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }

    private func factsGrid(_ building: Building) -> some View {
        let facts: [(String, String, String)] = [
            ("hammer.fill", "Architect", building.architect),
            ("paintpalette.fill", "Style", building.style),
            ("shippingbox.fill", "Materials", building.materials ?? vm.contributedMaterials),
            ("building.2.fill", "Use", building.use),
            ("calendar", "Year Built", building.yearBuilt?.replacingOccurrences(of: ".0", with: "")),
        ].compactMap { icon, label, val in
            guard let v = val, !v.isEmpty else { return nil }
            let lower = v.lowercased().trimmingCharacters(in: .whitespaces)
            if lower == "unknown" || lower == "nd" || lower == "not determined" || lower == "n/a" || lower == "0" { return nil }
            return (icon, label, Self.titleCase(v))
        }

        return VStack(spacing: 0) {
            ForEach(Array(facts.enumerated()), id: \.offset) { i, fact in
                HStack(spacing: 12) {
                    Image(systemName: fact.0)
                        .font(.subheadline)
                        .foregroundStyle(AppColors.accent)
                        .frame(width: 22)

                    Text(fact.1.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.secondary)
                        .frame(width: 72, alignment: .leading)

                    Text(fact.2)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .multilineTextAlignment(.leading)
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 16)

                if i < facts.count - 1 {
                    Divider().padding(.leading, 50)
                }
            }
        }
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func cleanStorytelling(_ raw: String) -> String {
        var text = raw

        // Remove Gemini preamble like "Okay, here are..." up to first real paragraph
        if let range = text.range(of: "Option 1", options: .caseInsensitive) {
            let afterOption1 = String(text[range.upperBound...])
            if let opt2 = afterOption1.range(of: "Option 2", options: .caseInsensitive) {
                text = String(afterOption1[..<opt2.lowerBound])
            } else {
                text = afterOption1
            }
        } else if let range = text.range(of: "Okay,", options: .caseInsensitive) {
            if let newline = text[range.upperBound...].firstIndex(of: "\n") {
                text = String(text[text.index(after: newline)...])
            }
        }

        // Strip markdown formatting
        text = text.replacingOccurrences(of: "**", with: "")
        text = text.replacingOccurrences(of: #"\*([^*]+)\*"#, with: "$1", options: .regularExpression) // *italic*
        text = text.replacingOccurrences(of: #"_([^_]+)_"#, with: "$1", options: .regularExpression)   // _underline_
        text = text.replacingOccurrences(of: #"^#{1,3}\s+"#, with: "", options: .regularExpression)     // # headings
        
        // Strip option headers
        text = text.replacingOccurrences(of: #"Option \d+[:\s]*"#, with: "", options: .regularExpression)
        
        // Strip informal conversational openers
        let informalPrefixes = [
            #"^Hold up,?\s*"#,
            #"^Did you know\s+(that\s+)?"#,
            #"^Fun fact:?\s*"#,
            #"^Get this[—:,]?\s*"#,
            #"^Here'?s the thing[—:,]?\s*"#,
            #"^So,?\s+"#,
        ]
        for pattern in informalPrefixes {
            text = text.replacingOccurrences(of: pattern, with: "", options: [.regularExpression, .caseInsensitive])
        }
        
        // Strip surrounding quotes
        text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.hasPrefix("\"") && text.hasSuffix("\"") {
            text = String(text.dropFirst().dropLast())
        }
        
        // Ensure first character is capitalized after stripping
        if let first = text.first, first.isLowercase {
            text = first.uppercased() + text.dropFirst()
        }
        
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Title-case a string: capitalize first letter of each word, but preserve known acronyms
    private static func titleCase(_ input: String) -> String {
        let lowercaseWords: Set<String> = ["of", "the", "and", "in", "for", "at", "by", "de", "van", "von", "le", "la"]
        let words = input.split(separator: " ").enumerated().map { index, word -> String in
            let lower = word.lowercased()
            // Don't lowercase Roman numerals or known acronyms
            let upper = word.uppercased()
            if upper == String(word) && word.count <= 4 && word.count > 1 { return String(word) } // Keep "II", "III", "SOM" etc.
            if index > 0 && lowercaseWords.contains(lower) { return lower }
            return lower.prefix(1).uppercased() + lower.dropFirst()
        }
        return words.joined(separator: " ")
    }

    private func loreSection(_ building: Building) -> some View {
        let rawDesc = building.description
        let desc = rawDesc.map { cleanStorytelling($0) }
        let isCorrupted = desc.flatMap { Double($0) } != nil
        let isValid = desc != nil && (desc?.count ?? 0) > 10 && !isCorrupted

        return VStack(alignment: .leading, spacing: 12) {
            Text("The Story")
                .font(.caption.bold())
                .foregroundStyle(AppColors.accent)
                .textCase(.uppercase)

            Text(isValid ? desc! : "No historical records found for this building. This building may not be a designated NYC landmark.")
                .font(.body)
                .lineSpacing(5)
                .foregroundStyle(isValid ? .primary : .secondary)

            if isValid {
                Text("Source: NYC Landmarks Preservation Commission")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .italic()
            }

        }
        .padding(20)
        .overlay(alignment: .bottom) { Divider() }
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



// MARK: - Preference Key

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
