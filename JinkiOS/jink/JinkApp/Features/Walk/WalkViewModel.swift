import Foundation
import UIKit
import CoreLocation
import Supabase

// MARK: - BuildingStop

struct BuildingStop: Identifiable {
    let id: String
    let name: String
    let address: String?
    let latitude: Double
    let longitude: Double
    var coordinate: CLLocationCoordinate2D { .init(latitude: latitude, longitude: longitude) }
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
    var verifiedBuildingDetail: BuildingResult? = nil
    var verificationLoadingMessage = ""

    // Navigation state
    var buildings: [BuildingStop] = []
    var currentBuildingIndex: Int = 0
    var visitedBuildingIds: Set<String> = []
    var walkXP: Int = 0

    private let locationService: LocationService
    private var locationObservation: Task<Void, Never>? = nil
    private var walkStartTime: Date? = nil

    init(locationService: LocationService) {
        self.locationService = locationService
    }

    // MARK: - Computed navigation helpers

    var currentStop: BuildingStop? { buildings[safe: currentBuildingIndex] }

    var currentLocation: CLLocationCoordinate2D? { locationService.location?.coordinate }

    var userHeading: Double { locationService.compassBearing }

    var distanceToCurrentStop: Double? {
        guard let loc = currentLocation, let stop = currentStop else { return nil }
        return haversine(loc, stop.coordinate)
    }

    var bearingToCurrentStop: Double? {
        guard let loc = currentLocation, let stop = currentStop else { return nil }
        return bearing(from: loc, to: stop.coordinate)
    }

    var progressFraction: Double {
        Double(visitedBuildingIds.count) / Double(max(buildings.count, 1))
    }

    var distanceString: String {
        guard let d = distanceToCurrentStop else { return "—" }
        return Self.formatDistance(d)
    }

    var etaString: String {
        guard let d = distanceToCurrentStop else { return "—" }
        let minutes = max(1, Int(d / 80)) // ~80 m/min walking pace
        return "\(minutes) min"
    }

    var stopIndexString: String {
        guard !buildings.isEmpty else { return "" }
        return "\(currentBuildingIndex + 1) of \(buildings.count)"
    }

    // Turn-by-turn: simple bearing-based instruction toward current stop
    var currentDirectionInstruction: String {
        guard let b = bearingToCurrentStop else { return "Head toward destination" }
        let icon = turnIcon(bearing: b)
        let cardinal = bearingToCardinal(b)
        let dist = distanceToCurrentStop.map { Self.formatDistance($0) } ?? ""
        return "\(icon)  Head \(cardinal)\(dist.isEmpty ? "" : "  ·  \(dist)")"
    }

    var nextDirectionHint: String? {
        guard let loc = currentLocation, let stop = currentStop else { return nil }
        let dist = distanceToCurrentStop ?? 0
        guard dist > 50 else { return nil }
        // Simulate "then" step: bearing from midpoint to stop
        let midLat = (loc.latitude + stop.latitude) / 2
        let midLng = (loc.longitude + stop.longitude) / 2
        let midCoord = CLLocationCoordinate2D(latitude: midLat, longitude: midLng)
        let finalBearing = bearing(from: midCoord, to: stop.coordinate)
        let currentBrng = bearing(from: loc, to: stop.coordinate)
        var diff = finalBearing - currentBrng
        while diff > 180 { diff -= 360 }
        while diff < -180 { diff += 360 }
        if abs(diff) < 20 { return nil } // Straight — not worth showing
        let turnWord = diff > 0 ? "right" : "left"
        let icon = diff > 0 ? "↱" : "↰"
        return "Then: \(icon) Turn \(turnWord) toward \(stop.name)"
    }

    var buildingSideHint: String? {
        guard let b = bearingToCurrentStop else { return nil }
        guard let dist = distanceToCurrentStop, dist < 300 else { return nil }
        var diff = b - userHeading
        while diff > 180 { diff -= 360 }
        while diff < -180 { diff += 360 }
        let side = diff > 0 ? "right" : "left"
        guard let name = currentStop?.name else { return nil }
        return "\(name) on your \(side)"
    }

    // MARK: - Formatting helpers

    static func formatDistance(_ meters: Double) -> String {
        let feet = meters * 3.28084
        if feet < 2640 {
            return "\(Int(feet.rounded())) ft"
        }
        let miles = meters * 0.000621371
        return String(format: "%.1f mi", miles)
    }

    private func bearingToCardinal(_ deg: Double) -> String {
        let dirs = ["N","NE","E","SE","S","SW","W","NW"]
        let idx = Int(((deg + 22.5) / 45).truncatingRemainder(dividingBy: 8))
        return dirs[max(0, min(7, idx))]
    }

    private func turnIcon(bearing: Double) -> String {
        let dirs: [(range: ClosedRange<Double>, icon: String)] = [
            (337.5...360, "↑"), (0...22.5, "↑"),
            (22.5...67.5, "↗"), (67.5...112.5, "→"),
            (112.5...157.5, "↘"), (157.5...202.5, "↓"),
            (202.5...247.5, "↙"), (247.5...292.5, "←"),
            (292.5...337.5, "↖"),
        ]
        for d in dirs where d.range.contains(bearing) { return d.icon }
        return "↑"
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
            errorMessage = "Waiting for GPS…"
            return
        }

        isVerifying = true
        errorMessage = nil
        verificationLoadingMessage = "Analyzing architecture..."

        let bearing = locationService.compassBearing
        let pitch = locationService.devicePitch
        let altitude = location.altitude
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude
        let gpsAccuracy = location.horizontalAccuracy
        let speed = max(location.speed, 0)
        let movementType: String
        if speed < 0.5 { movementType = "stationary" }
        else if speed < 2.0 { movementType = "walking" }
        else { movementType = "moving" }

        do {
            let result = try await ScanAPIService.shared.scan(
                image: image,
                lat: lat,
                lng: lng,
                bearing: bearing,
                pitch: pitch,
                altitude: altitude,
                gpsAccuracy: gpsAccuracy,
                movementType: movementType
            )

            if let building = result.building, building.bin == currentStop?.id {
                // Success: Verified the correct building
                // Insert aesthetic event
                try? await AestheticService.shared.insertScanEvent(
                    userId: userId,
                    buildingBbl: building.bbl,
                    aestheticVector: building.aestheticProfile.map { profile in
                        var dict: [String: Double] = [:]
                        for item in profile.all { dict[item.name.lowercased()] = item.score }
                        return dict
                    },
                    subtype: "walk_scan"
                )
                // Award XP and visit
                try? await XPService.shared.awardXP(userId: userId, amount: 25)
                
                self.verifiedBuildingDetail = building
                self.showInsights = true
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            } else if result.verified {
                errorMessage = "Found \(result.building?.name ?? "a different building"). Keep looking for \(currentStop?.name ?? "the destination")!"
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

    private func advanceBuilding() {
        if currentBuildingIndex < buildings.count - 1 {
            currentBuildingIndex += 1
        }
    }

    // MARK: - Walk lifecycle

    func startWalk(routeType: WalkRouteType, userId: String, durationMinutes: Int = 30) async {
        errorMessage = nil
        do {
            struct WalkRow: Decodable { let id: String }
            let loc = locationService.location
            var params: [String: AnyJSON] = [
                "user_id": .string(userId),
                "started_at": .string(ISO8601DateFormatter().string(from: Date())),
                "route_tier": .string(routeType.rawValue),
                "route_xp_multiplier": .double(1.0),
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

            // Fetch real buildings by proximity, fall back to sample
            let buildingCount = max(3, min(12, durationMinutes / 7))
            if let coord = locationService.location?.coordinate {
                buildings = await fetchNearbyBuildings(coordinate: coord, count: buildingCount)
            }
            if buildings.isEmpty {
                buildings = sampleNYCRoute()
            }

            startTrackingLocation()

            // Dynamic Island Live Activity
            let initialState = WalkActivityState(
                buildingName: buildings.first?.name ?? "First stop",
                distanceString: "—",
                etaString: "—",
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

    func completeWalk(userId: String) async {
        guard let walkId else { return }
        isCompleting = true
        defer { isCompleting = false }

        do {
            let params: [String: AnyJSON] = [
                "p_user_id": .string(userId),
                "p_walk_id": .string(walkId),
                "p_completed_at": .string(ISO8601DateFormatter().string(from: Date()))
            ]
            try await SupabaseService.shared.client
                .rpc("complete_walk_session", params: params)
                .execute()

            let totalXP = walkXP + 100
            xpEarned = totalXP

            // Calculate real duration and distance
            let duration = walkStartTime.map { Int(Date().timeIntervalSince($0) / 60) }
            let distance: Double? = routeCoordinates.count > 1
                ? zip(routeCoordinates, routeCoordinates.dropFirst())
                    .reduce(0.0) { $0 + haversine($1.0, $1.1) } / 1000.0
                : nil

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
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Location tracking

    private func startTrackingLocation() {
        locationObservation = Task { [weak self] in
            guard let self else { return }
            while self.isWalkActive {
                if let loc = self.locationService.location {
                    await MainActor.run {
                        self.routeCoordinates.append(loc.coordinate)
                    }
                }
                await WalkLiveActivityService.shared.update(state: self.currentActivityState)
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func stopTrackingLocation() {
        locationObservation?.cancel()
        locationObservation = nil
    }

    // MARK: - Private geo helpers

    private func haversine(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        let R = 6_371_000.0
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let sinDLat = sin(dLat / 2)
        let sinDLon = sin(dLon / 2)
        let x = sinDLat * sinDLat + cos(lat1) * cos(lat2) * sinDLon * sinDLon
        return R * 2 * atan2(sqrt(x), sqrt(1 - x))
    }

    private func bearing(from a: CLLocationCoordinate2D, to b: CLLocationCoordinate2D) -> Double {
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let y = sin(dLon) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        let deg = atan2(y, x) * 180 / .pi
        return (deg + 360).truncatingRemainder(dividingBy: 360)
    }

    // MARK: - Fetch nearby buildings from Supabase

    func fetchNearbyBuildings(coordinate: CLLocationCoordinate2D, count: Int) async -> [BuildingStop] {
        struct BuildingRow: Decodable {
            let bin: String?
            let building_name: String?
            let address: String?
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
                return BuildingStop(
                    id: row.bin ?? "\(bLat),\(bLng)",
                    name: row.building_name ?? "Unknown Building",
                    address: row.address,
                    latitude: bLat,
                    longitude: bLng
                )
            }

            print("[WalkViewModel] ✅ Returning \(stops.count) building stops")
            return stops
        } catch {
            print("[WalkViewModel] ❌ fetchNearbyBuildings failed: \(error)")
            return []
        }
    }

    // MARK: - Sample route

    private func sampleNYCRoute() -> [BuildingStop] {
        [
            BuildingStop(id: "flatiron", name: "Flatiron Building",
                         address: "175 5th Ave, New York, NY",
                         latitude: 40.7411, longitude: -73.9897),
            BuildingStop(id: "chrysler", name: "Chrysler Building",
                         address: "405 Lexington Ave, New York, NY",
                         latitude: 40.7516, longitude: -73.9755),
            BuildingStop(id: "gc-terminal", name: "Grand Central Terminal",
                         address: "89 E 42nd St, New York, NY",
                         latitude: 40.7527, longitude: -73.9772),
            BuildingStop(id: "ny-public-lib", name: "New York Public Library",
                         address: "476 5th Ave, New York, NY",
                         latitude: 40.7532, longitude: -73.9822),
        ]
    }
}
