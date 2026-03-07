import Foundation
import Supabase

struct AestheticEventPayload: Encodable, Sendable {
    let userId: String
    let eventType: String
    let eventSubtype: String?
    let buildingBbl: String?
    let payload: [String: String]
    let aestheticVector: [String: Double]?
    let baseWeight: Double
    let eventTimestamp: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case eventType = "event_type"
        case eventSubtype = "event_subtype"
        case buildingBbl = "building_bbl"
        case payload
        case aestheticVector = "aesthetic_vector"
        case baseWeight = "base_weight"
        case eventTimestamp = "event_timestamp"
    }
}

final class AestheticService {
    static let shared = AestheticService()
    private init() {}

    func insertScanEvent(
        userId: String,
        buildingBbl: String?,
        aestheticVector: [String: Double]?
    ) async throws {
        let event = AestheticEventPayload(
            userId: userId,
            eventType: "building_scan",
            eventSubtype: nil,
            buildingBbl: buildingBbl.map { String($0.prefix(10)) },
            payload: [:],
            aestheticVector: aestheticVector,
            baseWeight: 1.0,
            eventTimestamp: ISO8601DateFormatter().string(from: Date())
        )

        try await SupabaseService.shared.client
            .from("user_aesthetic_events")
            .insert(event)
            .execute()
    }
}
