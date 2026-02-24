import Foundation
import CoreLocation
import Supabase

@Observable
final class WalkViewModel {
    var walkId: String? = nil
    var isWalkActive = false
    var isCompleting = false
    var routeCoordinates: [CLLocationCoordinate2D] = []
    var xpEarned: Int? = nil
    var showXPSummary = false
    var errorMessage: String? = nil

    private let locationService: LocationService
    private var locationObservation: Task<Void, Never>? = nil

    init(locationService: LocationService) {
        self.locationService = locationService
    }

    func startWalk(routeType: WalkRouteType, userId: String) async {
        errorMessage = nil
        do {
            struct StartWalkParams: Encodable {
                let userId: String
                let routeType: String
                let startedAt: String

                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"
                    case routeType = "route_type"
                    case startedAt = "started_at"
                }
            }

            let params = StartWalkParams(
                userId: userId,
                routeType: routeType.rawValue,
                startedAt: ISO8601DateFormatter().string(from: Date())
            )

            struct WalkRow: Decodable { let id: String }
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
            if let loc = locationService.location {
                routeCoordinates.append(loc.coordinate)
            }
            startTrackingLocation()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func completeWalk(userId: String) async {
        guard let walkId else { return }
        isCompleting = true
        defer { isCompleting = false }

        struct CompleteWalkRPC: Encodable {
            let pUserId: String
            let pWalkId: String
            let pCompletedAt: String
            enum CodingKeys: String, CodingKey {
                case pUserId = "p_user_id"
                case pWalkId = "p_walk_id"
                case pCompletedAt = "p_completed_at"
            }
        }

        do {
            let params = CompleteWalkRPC(
                pUserId: userId,
                pWalkId: walkId,
                pCompletedAt: ISO8601DateFormatter().string(from: Date())
            )
            try await SupabaseService.shared.client
                .rpc("complete_walk_session", params: params)
                .execute()

            xpEarned = 100
            isWalkActive = false
            self.walkId = nil
            stopTrackingLocation()
            showXPSummary = true
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func startTrackingLocation() {
        locationObservation = Task { [weak self] in
            guard let self else { return }
            // Poll location every 5 seconds while walk is active
            while self.isWalkActive {
                if let loc = self.locationService.location {
                    await MainActor.run {
                        self.routeCoordinates.append(loc.coordinate)
                    }
                }
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func stopTrackingLocation() {
        locationObservation?.cancel()
        locationObservation = nil
    }
}
