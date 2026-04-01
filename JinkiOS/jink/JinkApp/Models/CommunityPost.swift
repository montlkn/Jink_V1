import Foundation
import Supabase

/// A community post — user-pinned observation, memory, or find shown on the explore map for all users
struct CommunityPost: Identifiable, Decodable {
    let id: String
    let userId: String
    let imageUrl: String
    let caption: String
    let latitude: Double
    let longitude: Double
    let buildingBbl: String?
    let createdAt: Date?
    let isFlagged: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case imageUrl = "image_url"
        case caption
        case latitude, longitude
        case buildingBbl = "building_bbl"
        case createdAt = "created_at"
        case isFlagged = "is_flagged"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        userId = try c.decode(String.self, forKey: .userId)
        imageUrl = try c.decode(String.self, forKey: .imageUrl)
        caption = try c.decode(String.self, forKey: .caption)
        latitude = try c.decode(Double.self, forKey: .latitude)
        longitude = try c.decode(Double.self, forKey: .longitude)
        buildingBbl = try c.decodeIfPresent(String.self, forKey: .buildingBbl)
        createdAt = try c.decodeIfPresent(Date.self, forKey: .createdAt)
        isFlagged = try c.decodeIfPresent(Bool.self, forKey: .isFlagged) ?? false
    }
}

/// Service for community post CRUD
@MainActor
class CommunityPostService {
    static let shared = CommunityPostService()

    /// Fetch posts within a bounding box for the explore map
    func fetchPosts(minLat: Double, maxLat: Double, minLng: Double, maxLng: Double) async throws -> [CommunityPost] {
        let posts: [CommunityPost] = try await SupabaseService.shared.client
            .from("community_posts")
            .select()
            .gte("latitude", value: minLat)
            .lte("latitude", value: maxLat)
            .gte("longitude", value: minLng)
            .lte("longitude", value: maxLng)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value

        return posts
    }

    /// Flag a community post as inappropriate
    func flagPost(id: String) async throws {
        try await SupabaseService.shared.client
            .from("community_posts")
            .update(["is_flagged": AnyJSON.bool(true)])
            .eq("id", value: id)
            .execute()
    }

    /// Submit a new community post
    func submitPost(imageData: Data, caption: String, latitude: Double, longitude: Double) async throws {
        // Upload image to Supabase storage
        let fileName = "\(UUID().uuidString).jpg"
        let storagePath = "community-posts/\(fileName)"

        try await SupabaseService.shared.client.storage
            .from("community-posts")
            .upload(storagePath, data: imageData, options: .init(contentType: "image/jpeg"))

        let publicUrl = try SupabaseService.shared.client.storage
            .from("community-posts")
            .getPublicURL(path: storagePath)
            .absoluteString

        // Insert post record
        let payload: [String: AnyJSON] = [
            "image_url": .string(publicUrl),
            "caption": .string(caption),
            "latitude": .double(latitude),
            "longitude": .double(longitude)
        ]

        try await SupabaseService.shared.client
            .from("community_posts")
            .insert(payload)
            .execute()
    }
}
