import Foundation
import UIKit
import CoreLocation
import Supabase

// MARK: - BuildingStop

struct BuildingStop: Identifiable {
    let id: String        // bin ?? bbl ?? coord  for Identifiable
    let bin: String?
    let bbl: String?
    let name: String
    let address: String?
    let style: String?
    let description: String?
    let primaryAesthetic: String?
    let secondaryAesthetic: String?
    var matchedAesthetic: String? // Mutated during score sorting to store the win reason
    let latitude: Double
    let longitude: Double
    var coordinate: CLLocationCoordinate2D { .init(latitude: latitude, longitude: longitude) }
    var displayName: String {
        (name.isEmpty || name == "0") ? (address ?? "Unknown Address") : name
    }
}

// MARK: - Collection safe subscript

private extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// MARK: - WalkCompletionStats

struct WalkCompletionStats {
    let walkId: String?
    let xpEarned: Int
    let visitedCount: Int
    let totalCount: Int
    let visitedIds: Set<String>
    let distanceKm: Double?
    let durationMinutes: Int?
    let buildings: [BuildingStop]
}

// MARK: - WalkViewModel

@Observable
final class WalkViewModel {
    var walkId: String? = nil
    var isWalkActive = false
    var isCompleting = false
    var routeCoordinates: [CLLocationCoordinate2D] = []
    var xpEarned: Int? = nil
    var showXPSummary = false
    var completionStats: WalkCompletionStats? = nil
    var errorMessage: String? = nil
    
    // Verification State
    var isVerifying = false
    var showInsights = false
    var showARProximity = false
    var verifiedBuildingDetail: ScanMatch? = nil
    var verificationLoadingMessage = ""

    // Navigation state
    var buildings: [BuildingStop] = []
    var currentBuildingIndex: Int = 0
    var visitedBuildingIds: Set<String> = []
    var walkXP: Int = 0

    // Apple Maps route state
    var currentRoute: WalkingRoute? = nil
    var currentStepIndex: Int = 0
    var currentRouteInstruction: String? {
        // When close to the stop, use compass-bearing for precise directions
        if let dist = distanceToCurrentStop, dist < 150,
           let bearing = bearingToCurrentStop {
            let heading = userHeading
            var relative = bearing - heading
            if relative < 0 { relative += 360 }
            if relative > 360 { relative -= 360 }
            return closeRangeDirection(relativeBearing: relative, distanceFeet: dist * 3.28084)
        }
        // Farther away: use Apple Maps route steps
        guard let route = currentRoute, currentStepIndex < route.steps.count else { return nil }
        return route.steps[currentStepIndex].instruction
    }

    /// Converts a relative bearing (0-360, 0 = straight ahead) to human-readable clock-position text
    private func closeRangeDirection(relativeBearing: Double, distanceFeet: Double) -> String {
        let distText = distanceFeet < 300 ? "\(Int(distanceFeet)) ft" : String(format: "%.1f mi", distanceFeet / 5280)
        let clock: String
        switch relativeBearing {
        case 0..<15, 345..<360:   clock = "Straight ahead"
        case 15..<45:             clock = "Slightly right (1 o'clock)"
        case 45..<75:             clock = "To your right (2 o'clock)"
        case 75..<105:            clock = "Hard right (3 o'clock)"
        case 105..<135:           clock = "Behind right (4 o'clock)"
        case 135..<165:           clock = "Behind left (5 o'clock)"
        case 165..<195:           clock = "Behind you"
        case 195..<225:           clock = "Behind left (7 o'clock)"
        case 225..<255:           clock = "Hard left (9 o'clock)"
        case 255..<285:           clock = "To your left (10 o'clock)"
        case 285..<315:           clock = "Slightly left (11 o'clock)"
        case 315..<345:           clock = "Slightly left (11 o'clock)"
        default:                  clock = "Ahead"
        }
        return "\(clock) — \(distText)"
    }
    
    // Gemini AI insight state
    var currentStopInsight: String? = nil
    var isFetchingInsight = false
    var userDominantArchetype: String = "Classicist"

    private let locationService: LocationService
    private var locationObservation: Task<Void, Never>? = nil
    private var walkStartTime: Date? = nil
    private var insightCache: [String: String] = [:]

    init(locationService: LocationService) {
        self.locationService = locationService
    }

    // MARK: - Computed navigation helpers

    var currentStop: BuildingStop? { buildings[safe: currentBuildingIndex] }

    var currentLocation: CLLocationCoordinate2D? { locationService.location?.coordinate }

    var userHeading: Double { locationService.compassBearing }

    var distanceToCurrentStop: Double? {
        guard let loc = currentLocation, let stop = currentStop else { return nil }
        return loc.distance(to: stop.coordinate)
    }

    var bearingToCurrentStop: Double? {
        guard let loc = currentLocation, let stop = currentStop else { return nil }
        return loc.bearing(to: stop.coordinate)
    }

    var progressFraction: Double {
        Double(visitedBuildingIds.count) / Double(max(buildings.count, 1))
    }

    var distanceString: String {
        // Prefer Apple Maps route distance when available
        if let route = currentRoute {
            return Self.formatDistance(route.distance)
        }
        guard let d = distanceToCurrentStop else { return "" }
        return Self.formatDistance(d)
    }

    var etaString: String {
        // Prefer Apple Maps ETA when available
        if let route = currentRoute {
            let minutes = max(1, Int(route.expectedTravelTime / 60))
            return "\(minutes) min"
        }
        guard let d = distanceToCurrentStop else { return "" }
        let minutes = max(1, Int(d / 80)) // ~80 m/min walking pace
        return "\(minutes) min"
    }

    var stopIndexString: String {
        guard !buildings.isEmpty else { return "" }
        return "\(currentBuildingIndex + 1) of \(buildings.count)"
    }

    // MARK: - Formatting helpers

    static func formatDistance(_ meters: Double) -> String {
        let feet = meters * 3.28084
        if feet < 1000 {
            return "\(Int(feet.rounded())) ft"
        }
        let miles = meters * 0.000621371
        return String(format: "%.1f mi", miles)
    }

    // MARK: - Live Activity state

    var currentActivityState: WalkActivityState {
        WalkActivityState(
            buildingName: currentStop?.name ?? "Next stop",
            distanceString: distanceString,
            etaString: etaString,
            bearingToBuilding: bearingToCurrentStop ?? 0,
            userHeading: userHeading,
            verifiedCount: visitedBuildingIds.count,
            walkXP: walkXP
        )
    }

    // MARK: - Visit / Skip

    func verifyWithImage(_ image: UIImage, userId: String) async {
        guard let location = locationService.location else {
            errorMessage = "Waiting for GPS¦"
            return
        }

        isVerifying = true
        errorMessage = nil
        verificationLoadingMessage = "Analyzing architecture..."

        let bearing = locationService.compassBearing
        let pitch = locationService.devicePitch
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude
        let gpsAccuracy = location.horizontalAccuracy

        do {
            let result = try await ScanAPIService.shared.scan(
                image: image,
                lat: lat,
                lng: lng,
                bearing: bearing,
                pitch: pitch,
                gpsAccuracy: gpsAccuracy,
                userId: userId
            )

            if let match = result.topMatch, let stop = currentStop, matchesStop(match: match, stop: stop) {
                // Success: Verified the correct building
                try? await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: match.bbl,
                    aestheticVector: nil,
                    subtype: "walk_scan"
                )
                // Record scan in walk_seen_points so complete_walk_session counts it for XP
                if let wId = walkId {
                    let seenPayload: [String: AnyJSON] = [
                        "walk_id": .string(wId),
                        "building_id": .string(stop.bbl ?? stop.bin ?? stop.id),
                        "lat": .double(lat),
                        "lng": .double(lng),
                        "scanned": .bool(true),
                        "timestamp": .string(ISO8601DateFormatter().string(from: Date()))
                    ]
                    try? await SupabaseService.shared.client
                        .from("walk_seen_points")
                        .insert(seenPayload)
                        .execute()
                }
                // Award XP and visit
                try? await XPService.shared.awardXP(userId: userId, amount: 25)
                
                self.verifiedBuildingDetail = match
                self.showInsights = true
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            } else if result.verified {
                errorMessage = "Found \(result.topMatch?.name ?? "a different building"). Keep looking for \(currentStop?.name ?? "the destination")!"
            } else {
                errorMessage = "Building not recognized. Try getting closer or a clearer angle."
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isVerifying = false
    }

    func visitBuilding() {
        guard let stop = currentStop else { return }
        visitedBuildingIds.insert(stop.id)
        walkXP += 25
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        advanceBuilding()
        Task { await WalkLiveActivityService.shared.update(state: currentActivityState) }
    }

    func skipBuilding() {
        advanceBuilding()
        Task { await WalkLiveActivityService.shared.update(state: currentActivityState) }
    }

    func undoSkipBuilding() {
        if currentBuildingIndex > 0 {
            currentBuildingIndex -= 1
            currentStepIndex = 0
            
            // If they visited it before skipping, un-visit it so they can do it again if they want,
            // or we could just leave it. Let's let them go back to it.
            if let stop = currentStop {
                visitedBuildingIds.remove(stop.id)
            }
            
            Task { await requestRouteToCurrentStop() }
            Task { await WalkLiveActivityService.shared.update(state: currentActivityState) }
        }
    }

    private func advanceBuilding() {
        if currentBuildingIndex < buildings.count - 1 {
            currentBuildingIndex += 1
            currentStepIndex = 0
            // Check cache before clearing so there's no flash of empty state
            if let stop = currentStop, let cached = insightCache[stop.id] {
                currentStopInsight = cached
            } else {
                currentStopInsight = nil
            }
            Task { await requestRouteToCurrentStop() }
            Task { await fetchInsightForCurrentStop() }
        }
    }

    // MARK: - Gemini Insights

    func fetchInsightForCurrentStop() async {
        guard let stop = currentStop else { return }

        // Return cached insight immediately  no API call needed
        if let cached = insightCache[stop.id] {
            await MainActor.run {
                self.currentStopInsight = cached
                self.isFetchingInsight = false
            }
            return
        }

        await MainActor.run {
            self.isFetchingInsight = true
        }

        let archetype = userDominantArchetype
        let prompt = """
        You are a formal, knowledgeable architectural reference.
        Write exactly ONE sentence (max 15 words) noting a specific architectural detail of this building.
        Building: \(stop.name)
        Style: \(stop.style ?? "Unknown")
        Primary aesthetic: \(stop.primaryAesthetic ?? stop.matchedAesthetic ?? "Unknown")
        The user's dominant aesthetic preference is: \(archetype)
        Focus on: one specific detail to observe that connects to \(archetype) principles.
        Be precise and factual. No superlatives, no informal language, no exclamation marks. End with a period.
        """

        if let aiResponse = await GeminiService.generate(prompt: prompt, maxTokens: 40, temperature: 0.4) {
            await MainActor.run {
                self.insightCache[stop.id] = aiResponse
                self.currentStopInsight = aiResponse
                self.isFetchingInsight = false
            }
        } else {
            await MainActor.run { self.isFetchingInsight = false }
        }
    }

    // MARK: - Apple Maps Route

    func requestRouteToCurrentStop() async {
        guard let loc = currentLocation, let stop = currentStop else { return }
        do {
            let route = try await AppleMapsDirectionsService.shared.requestWalkingRoute(
                from: loc,
                to: stop.coordinate
            )
            await MainActor.run {
                self.currentRoute = route
                self.currentStepIndex = 0
            }
            print("[WalkViewModel]  Apple Maps route: \(route.steps.count) steps, \(Self.formatDistance(route.distance))")
        } catch {
            print("[WalkViewModel]  Apple Maps route failed, using fallback: \(error.localizedDescription)")
            await MainActor.run { self.currentRoute = nil }
        }
    }

    /// Advance to the next route step when the user passes a step's endpoint
    func advanceRouteStepIfNeeded() {
        guard let route = currentRoute, let loc = currentLocation else { return }
        guard currentStepIndex < route.steps.count else { return }
        let step = route.steps[currentStepIndex]
        // If step has polyline, check distance to its last coordinate
        if let endpoint = step.polylineCoordinates.last {
            let dist = loc.distance(to: endpoint)
            if dist < 20 && currentStepIndex < route.steps.count - 1 {
                currentStepIndex += 1
            }
        }
    }

    // MARK: - Walk lifecycle

    func startWalk(routeType: WalkRouteType, userId: String, durationMinutes: Int = 30, includeVisited: Bool = false) async {
        errorMessage = nil
        do {
            struct WalkRow: Decodable { let id: String }
            let loc = locationService.location
            var xpMultiplier = 1.0
            if durationMinutes >= 10 && durationMinutes < 15 {
                xpMultiplier = 1.25
            } else if durationMinutes >= 15 && durationMinutes < 30 {
                xpMultiplier = 1.5
            } else if durationMinutes >= 30 && durationMinutes < 40 {
                xpMultiplier = 1.0
            } else if durationMinutes >= 40 && durationMinutes < 60 {
                xpMultiplier = 2.0
            } else if durationMinutes >= 60 && durationMinutes < 70 {
                xpMultiplier = 1.25
            } else if durationMinutes >= 70 && durationMinutes < 80 {
                xpMultiplier = 1.0
            } else if durationMinutes >= 80 {
                xpMultiplier = 2.0
            }

            var params: [String: AnyJSON] = [
                "user_id": .string(userId),
                "started_at": .string(ISO8601DateFormatter().string(from: Date())),
                "route_tier": .string(routeType.rawValue),
                "route_xp_multiplier": .double(xpMultiplier),
            ]
            if let loc {
                params["origin_lat"] = .double(loc.coordinate.latitude)
                params["origin_lng"] = .double(loc.coordinate.longitude)
            }
            let row: WalkRow = try await SupabaseService.shared.client
                .from("walks")
                .insert(params)
                .select("id")
                .single()
                .execute()
                .value

            walkId = row.id
            isWalkActive = true
            routeCoordinates = []
            walkXP = 0
            visitedBuildingIds = []
            currentBuildingIndex = 0
            walkStartTime = Date()

            if let loc = locationService.location {
                routeCoordinates.append(loc.coordinate)
            }

            var pastVisited: Set<String> = []
            if !includeVisited {
                struct ScanRow: Decodable { let confirmedBin: String?; enum CodingKeys: String, CodingKey { case confirmedBin = "confirmed_bin" } }
                if let rows = try? await SupabaseService.shared.buildingsClient.from("scans").select("confirmed_bin").eq("user_id", value: userId).not("confirmed_bin", operator: .is, value: "null").execute().value as [ScanRow] {
                    pastVisited = Set(rows.compactMap(\.confirmedBin).filter { !$0.isEmpty }.map { $0.replacingOccurrences(of: ".0", with: "") })
                }
            }

            // Fetch real buildings by proximity, rank by aesthetic, fall back to sample
            let buildingCount = max(3, min(12, durationMinutes / 7))
            if let coord = locationService.location?.coordinate {
                let rawStops = await fetchNearbyBuildings(coordinate: coord, count: buildingCount * 3)
                let userProfile = await fetchUserAestheticProfile(userId: userId) ?? [:]
                if !rawStops.isEmpty {
                    let eligibleStops = includeVisited ? rawStops : rawStops.filter {
                        let cleanBin = ($0.bin ?? "").replacingOccurrences(of: ".0", with: "")
                        let cleanBbl = ($0.bbl ?? "").replacingOccurrences(of: ".0", with: "")
                        return !pastVisited.contains(cleanBin) && !pastVisited.contains(cleanBbl)
                    }
                    let sortedStops = eligibleStops.isEmpty ? rawStops : eligibleStops
                    
                    let scoredStops = sortedStops.map { stop -> (BuildingStop, Double) in
                        var mutableStop = stop
                        let score = aestheticScore(stop: &mutableStop, userProfile: userProfile)
                        return (mutableStop, score)
                    }
                    buildings = scoredStops
                        .sorted { $0.1 > $1.1 }
                        .prefix(buildingCount)
                        .map { $0.0 }
                }
            }
            if buildings.isEmpty {
                buildings = sampleNYCRoute()
            }

            startTrackingLocation()

            // Request Apple Maps walking route to first stop
            await requestRouteToCurrentStop()
            
            // Generate Gemini insight for first stop
            await fetchInsightForCurrentStop()

            // Dynamic Island Live Activity
            let initialState = WalkActivityState(
                buildingName: buildings.first?.name ?? "First stop",
                distanceString: "",
                etaString: "",
                bearingToBuilding: 0,
                userHeading: 0,
                verifiedCount: 0,
                walkXP: 0
            )
            WalkLiveActivityService.shared.start(
                walkId: row.id,
                totalBuildings: buildings.count,
                initialState: initialState
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func completeWalk(userId: String, appState: AppState? = nil) async {
        guard let walkId else { return }
        isCompleting = true
        defer { isCompleting = false }

        let params: [String: AnyJSON] = [
            "p_user_id": .string(userId),
            "p_walk_id": .string(walkId),
            "p_completed_at": .string(ISO8601DateFormatter().string(from: Date()))
        ]
        struct CompleteWalkResult: Decodable {
            let totalXp: Int?
            enum CodingKeys: String, CodingKey { case totalXp = "total_xp" }
        }
        let rpcResult = try? await SupabaseService.shared.client
            .rpc("complete_walk_session", params: params)
            .execute()
            .value as CompleteWalkResult

        let totalXP = rpcResult?.totalXp ?? (walkXP + 100)
        xpEarned = totalXP

        // Calculate real duration and distance
        let duration = walkStartTime.map { Int(Date().timeIntervalSince($0) / 60) }
        let distance: Double? = routeCoordinates.count > 1
            ? zip(routeCoordinates, routeCoordinates.dropFirst())
                .reduce(0.0) { $0 + $1.0.distance(to: $1.1) } / 1000.0
            : nil

        // Persist distance to the walk record
        if let distanceKm = distance {
            _ = try? await SupabaseService.shared.client
                .from("walks")
                .update(["distance_km": AnyJSON.double(distanceKm)])
                .eq("id", value: walkId)
                .execute()
        }
        
        // Trigger real-time progress updates (Streaks, Achievements, Algo)
        await ProgressService.shared.processWalk(userId: userId)

        // Trigger passport refresh
        if let appState {
            await MainActor.run { appState.passportRefreshTrigger += 1 }
        }

        completionStats = WalkCompletionStats(
            walkId: walkId,
            xpEarned: totalXP,
            visitedCount: visitedBuildingIds.count,
            totalCount: buildings.count,
            visitedIds: visitedBuildingIds,
            distanceKm: distance,
            durationMinutes: duration,
            buildings: buildings
        )
        isWalkActive = false
        self.walkId = nil
        stopTrackingLocation()
        WalkLiveActivityService.shared.end()
        showXPSummary = true
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }

    func cancelWalk() {
        isWalkActive = false
        walkId = nil
        buildings.removeAll()
        visitedBuildingIds.removeAll()
        routeCoordinates.removeAll()
        currentBuildingIndex = 0
        stopTrackingLocation()
        WalkLiveActivityService.shared.end()
    }

    // MARK: - Location tracking

    private func startTrackingLocation() {
        locationObservation = Task { [weak self] in
            while !Task.isCancelled {
                guard let self = self, self.isWalkActive else { break }
                
                if let loc = self.locationService.location {
                    await MainActor.run {
                        self.routeCoordinates.append(loc.coordinate)
                        self.advanceRouteStepIfNeeded()
                    }
                }
                await WalkLiveActivityService.shared.update(state: self.currentActivityState)
                
                // Sleep for 2 seconds for responsive distance updates
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }
    }

    private func stopTrackingLocation() {
        locationObservation?.cancel()
        locationObservation = nil
    }

    // MARK: - Stop matching (BIN preferred, BBL fallback)

    private func matchesStop(match: ScanMatch, stop: BuildingStop) -> Bool {
        if !match.bin.isEmpty, let stopBin = stop.bin, !stopBin.isEmpty {
            return match.bin == stopBin
        }
        if let bbl = match.bbl, !bbl.isEmpty, let stopBbl = stop.bbl, !stopBbl.isEmpty {
            return bbl == stopBbl
        }
        return false
    }

    // MARK: - Aesthetic ranking

    private func fetchUserAestheticProfile(userId: String) async -> [String: Double]? {
        struct ProfileResult: Decodable {
            let aestheticVector: [String: Double]?
            enum CodingKeys: String, CodingKey { case aestheticVector = "aesthetic_vector" }
        }
        let result = try? await SupabaseService.shared.client
            .rpc("get_user_aesthetic_profile", params: ["p_user_id": AnyJSON.string(userId)])
            .execute()
            .value as ProfileResult
        return result?.aestheticVector
    }

    private func aestheticScore(stop: inout BuildingStop, userProfile: [String: Double]) -> Double {
        var bestScore: Double = 0.0
        var bestReason: String? = nil

        if let primary = stop.primaryAesthetic?.lowercased(), let score = userProfile[primary], score > 0 {
            bestScore = score
            bestReason = stop.primaryAesthetic
        }

        if let secondary = stop.secondaryAesthetic?.lowercased(), let score = userProfile[secondary], score > bestScore {
            bestScore = score
            bestReason = stop.secondaryAesthetic
        }

        if bestScore == 0.0 {
            // Fallback to style string match proxy if aesthetics are missing
            let style = (stop.style ?? "").lowercased()
            if let score = userProfile[style], score > 0 {
                bestScore = score
                bestReason = stop.style
            }
        }

        stop.matchedAesthetic = bestReason
        return bestScore
    }

    // MARK: - Fetch nearby buildings from Supabase

    func fetchNearbyBuildings(coordinate: CLLocationCoordinate2D, count: Int) async -> [BuildingStop] {
        struct BuildingRow: Decodable {
            let bin: String?
            let bbl: String?
            let building_name: String?
            let address: String?
            let style: String?
            let storytelling: String?
            let primary_aesthetic: String?
            let secondary_aesthetic: String?
            let geocoded_lat: String?
            let geocoded_lng: String?
        }

        let lat = coordinate.latitude
        let lng = coordinate.longitude
        print("[WalkViewModel] Fetching buildings near \(lat), \(lng) count=\(count)")

        do {
            let params: [String: AnyJSON] = [
                "lat": .double(lat),
                "lng": .double(lng),
                "radius_km": .double(2.0),
                "max_results": .integer(count)
            ]
            let rows: [BuildingRow] = try await SupabaseService.shared.buildingsClient
                .rpc("nearby_buildings", params: params)
                .execute()
                .value

            let stops = rows.compactMap { row -> BuildingStop? in
                guard let bLat = row.geocoded_lat.flatMap(Double.init),
                      let bLng = row.geocoded_lng.flatMap(Double.init) else { return nil }
                let bin = row.bin.flatMap { $0.isEmpty ? nil : $0 }
                let bbl = row.bbl.flatMap { $0.isEmpty ? nil : $0 }
                return BuildingStop(
                    id: bin ?? bbl ?? "\(bLat),\(bLng)",
                    bin: bin,
                    bbl: bbl,
                    name: row.building_name ?? "Unknown Building",
                    address: row.address,
                    style: row.style,
                    description: row.storytelling,
                    primaryAesthetic: row.primary_aesthetic,
                    secondaryAesthetic: row.secondary_aesthetic,
                    matchedAesthetic: nil,
                    latitude: bLat,
                    longitude: bLng
                )
            }

            print("[WalkViewModel]  Returning \(stops.count) building stops")
            return stops
        } catch {
            print("[WalkViewModel]  fetchNearbyBuildings failed: \(error)")
            return []
        }
    }

    // MARK: - Sample route

    private func sampleNYCRoute() -> [BuildingStop] {
        [
            BuildingStop(id: "flatiron", bin: nil, bbl: nil, name: "Flatiron Building",
                         address: "175 5th Ave, New York, NY", style: nil, description: nil,
                         primaryAesthetic: nil, secondaryAesthetic: nil, matchedAesthetic: nil, latitude: 40.7411, longitude: -73.9897),
            BuildingStop(id: "chrysler", bin: nil, bbl: nil, name: "Chrysler Building",
                         address: "405 Lexington Ave, New York, NY", style: nil, description: nil,
                         primaryAesthetic: nil, secondaryAesthetic: nil, matchedAesthetic: nil, latitude: 40.7516, longitude: -73.9755),
            BuildingStop(id: "gc-terminal", bin: nil, bbl: nil, name: "Grand Central Terminal",
                         address: "89 E 42nd St, New York, NY", style: nil, description: nil,
                         primaryAesthetic: nil, secondaryAesthetic: nil, matchedAesthetic: nil, latitude: 40.7527, longitude: -73.9772),
            BuildingStop(id: "ny-public-lib", bin: nil, bbl: nil, name: "New York Public Library",
                         address: "476 5th Ave, New York, NY", style: nil, description: nil,
                         primaryAesthetic: nil, secondaryAesthetic: nil, matchedAesthetic: nil, latitude: 40.7532, longitude: -73.9822),
        ]
    }
}
