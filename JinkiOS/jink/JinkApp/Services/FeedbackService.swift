import Foundation
import Supabase

struct BetaFeedbackPayload: Encodable, Sendable {
    let userId: String
    let featureIdea: String
    let painPoint: String
    let appVersion: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case featureIdea = "feature_idea"
        case painPoint = "pain_point"
        case appVersion = "app_version"
        case createdAt = "created_at"
    }
}

final class FeedbackService {
    static let shared = FeedbackService()
    private init() {}

    func submit(userId: String, featureIdea: String, painPoint: String) async throws {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        let payload = BetaFeedbackPayload(
            userId: userId,
            featureIdea: featureIdea,
            painPoint: painPoint,
            appVersion: version,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        try await SupabaseService.shared.client
            .from("beta_feedback")
            .insert(payload)
            .execute()
    }
}
