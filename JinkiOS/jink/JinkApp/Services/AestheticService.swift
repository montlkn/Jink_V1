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
        case aestheticVector = "building_aesthetic_profile"
        case baseWeight = "base_weight"
        case eventTimestamp = "event_timestamp"
    }
}

final class AestheticService {
    static let shared = AestheticService()
    private init() {}

    func insertEvent(
        userId: String,
        eventType: String,
        buildingBbl: String?,
        aestheticVector: [String: Double]?,
        subtype: String? = nil,
        baseWeight: Double = 1.0
    ) async throws {
        let event = AestheticEventPayload(
            userId: userId,
            eventType: eventType,
            eventSubtype: subtype,
            buildingBbl: buildingBbl.map { String($0.prefix(10)) },
            payload: [:],
            aestheticVector: aestheticVector,
            baseWeight: baseWeight,
            eventTimestamp: ISO8601DateFormatter().string(from: Date())
        )
        try await SupabaseService.shared.client
            .from("user_aesthetic_events")
            .insert(event)
            .execute()
    }

    /// Drains unprocessed aesthetic events via RPC, then fetches the updated profile.
    /// Returns nil if the RPC fails or no profile exists yet.
    func processProfile(userId: String) async -> AestheticProfile? {
        // Fire-and-forget the RPC (it writes to user_aesthetic_profiles internally)
        _ = try? await SupabaseService.shared.client
            .rpc("process_aesthetic_events_for_user", params: ["p_user_id": AnyJSON.string(userId), "p_batch_size": AnyJSON.integer(50)])
            .execute()
        // Now fetch the freshly-written profile
        return await fetchProfile(userId: userId)
    }

    func fetchProfile(userId: String) async -> AestheticProfile? {
        struct Row: Decodable {
            let normalizedScores: AestheticProfile?
            enum CodingKeys: String, CodingKey { case normalizedScores = "normalized_scores" }
        }
        let rows: [Row]? = try? await SupabaseService.shared.client
            .from("user_aesthetic_profiles")
            .select("normalized_scores")
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        return rows?.first?.normalizedScores
    }

    func insertScanEvent(
        userId: String,
        buildingBbl: String?,
        aestheticVector: [String: Double]?,
        subtype: String? = nil
    ) async throws {
        let event = AestheticEventPayload(
            userId: userId,
            eventType: "building_scan",
            eventSubtype: subtype,
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
