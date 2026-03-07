import Foundation
import Supabase

// MARK: - Listings Models

struct PropertyListing: Identifiable, Decodable, Hashable {
    static func == (lhs: PropertyListing, rhs: PropertyListing) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    let id: String
    let buildingBin: String?
    let listingType: String
    let price: Double?
    let beds: Int?
    let baths: Double?
    let sqft: Int?
    let description: String?
    let status: String?
    let photos: [ListingPhoto]
    let agent: ListingAgent?

    enum CodingKeys: String, CodingKey {
        case id
        case buildingBin = "bin"
        case listingType = "type"
        case price, beds, baths, sqft, description, status
        case photos = "listing_photos"
        case agent = "listing_agents"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        buildingBin = try c.decodeIfPresent(String.self, forKey: .buildingBin)
        listingType = try c.decodeIfPresent(String.self, forKey: .listingType) ?? "free"
        price = try c.decodeIfPresent(Double.self, forKey: .price)
        beds = try c.decodeIfPresent(Int.self, forKey: .beds)
        baths = try c.decodeIfPresent(Double.self, forKey: .baths)
        sqft = try c.decodeIfPresent(Int.self, forKey: .sqft)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        photos = try c.decodeIfPresent([ListingPhoto].self, forKey: .photos) ?? []
        // agent comes back as array from Supabase join
        let agentArray = try c.decodeIfPresent([ListingAgent].self, forKey: .agent)
        agent = agentArray?.first
    }

    var isPremium: Bool { listingType == "premium" }

    var priceLabel: String {
        guard let price else { return "Price on request" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "$\(Int(price))"
    }

    var specsLabel: String {
        var parts: [String] = []
        if let beds { parts.append("\(beds) bd") }
        if let baths { parts.append(baths == Double(Int(baths)) ? "\(Int(baths)) ba" : "\(baths) ba") }
        if let sqft { parts.append("\(sqft) sqft") }
        return parts.joined(separator: " · ")
    }
}

struct ListingPhoto: Identifiable, Decodable {
    let id: String
    let url: String
    let order: Int?

    enum CodingKeys: String, CodingKey {
        case id, url, order
    }
}

struct ListingAgent: Decodable {
    let name: String?
    let company: String?
    let phone: String?
    let email: String?
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case name, company, phone, email
        case photoUrl = "photo_url"
    }
}

struct TourRequestPayload: Encodable {
    let listingId: String
    let userId: String
    let name: String
    let email: String
    let phone: String
    let message: String
    let preferredDate: String?

    enum CodingKeys: String, CodingKey {
        case listingId = "listing_id"
        case userId = "user_id"
        case name, email, phone, message
        case preferredDate = "preferred_date"
    }
}

// MARK: - ListingsService

final class ListingsService {
    static let shared = ListingsService()
    private init() {}

    func fetchListings(for bin: String) async throws -> [PropertyListing] {
        let listings: [PropertyListing] = try await SupabaseService.shared.client
            .from("property_listings")
            .select("*, listing_photos(*), listing_agents(*)")
            .eq("bin", value: bin)
            .eq("status", value: "active")
            .execute()
            .value
        return listings
    }

    func fetchListing(id: String) async throws -> PropertyListing {
        let listing: PropertyListing = try await SupabaseService.shared.client
            .from("property_listings")
            .select("*, listing_photos(*), listing_agents(*)")
            .eq("id", value: id)
            .single()
            .execute()
            .value
        return listing
    }

    func submitTourRequest(_ payload: TourRequestPayload) async throws {
        try await SupabaseService.shared.client
            .from("listing_applications")
            .insert(payload)
            .execute()
    }

    func trackEvent(listingId: String, userId: String, eventType: String) async {
        do {
            struct AnalyticsPayload: Encodable {
                let listingId: String
                let userId: String
                let eventType: String
                enum CodingKeys: String, CodingKey {
                    case listingId = "listing_id"
                    case userId = "user_id"
                    case eventType = "event_type"
                }
            }
            try await SupabaseService.shared.client
                .from("listing_analytics")
                .insert(AnalyticsPayload(listingId: listingId, userId: userId, eventType: eventType))
                .execute()
        } catch {
            print("[ListingsService] Analytics error: \(error)")
        }
    }
}
