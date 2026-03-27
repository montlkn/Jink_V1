import Foundation
import Supabase

struct CommunityPost: Identifiable, Decodable {
    let id: String
    let userId: String
    let imageUrl: String
    let caption: String
    let latitude: Double?
    let longitude: Double?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imageUrl = "image_url"
        case caption
        case latitude
        case longitude
        case createdAt = "created_at"
    }
}

final class CommunityPostService {
    static let shared = CommunityPostService()
    private init() {}

    func submitPost(
        userId: String,
        imageData: Data,
        caption: String,
        latitude: Double?,
        longitude: Double?
    ) async throws {
        let fileName = "\(userId)/\(UUID().uuidString).jpg"
        let bucket = "community-posts"

        try await SupabaseService.shared.client.storage
            .from(bucket)
            .upload(fileName, data: imageData, options: FileOptions(contentType: "image/jpeg"))

        let publicURL = try SupabaseService.shared.client.storage
            .from(bucket)
            .getPublicURL(path: fileName)
            .absoluteString

        struct PostPayload: Encodable {
            let userId: String
            let imageUrl: String
            let caption: String?
            let latitude: Double?
            let longitude: Double?
            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case imageUrl = "image_url"
                case caption
                case latitude
                case longitude
            }
        }

        try await SupabaseService.shared.client
            .from("community_posts")
            .insert(PostPayload(
                userId: userId,
                imageUrl: publicURL,
                caption: caption.isEmpty ? nil : caption,
                latitude: latitude,
                longitude: longitude
            ))
            .execute()
    }

    func fetchPosts(minLat: Double, maxLat: Double, minLng: Double, maxLng: Double) async throws -> [CommunityPost] {
        let posts: [CommunityPost] = try await SupabaseService.shared.client
            .from("community_posts")
            .select("id, user_id, image_url, caption, latitude, longitude, created_at")
            .gte("latitude", value: minLat)
            .lte("latitude", value: maxLat)
            .gte("longitude", value: minLng)
            .lte("longitude", value: maxLng)
            .not("latitude", operator: .is, value: "null")
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value
        return posts
    }
}
