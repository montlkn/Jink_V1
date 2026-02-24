import Foundation

struct Building: Identifiable, Decodable {
    let bbl: String
    let name: String?
    let address: String?
    let architect: String?
    let yearBuilt: Int?
    let style: String?
    let description: String?
    let aestheticProfile: AestheticProfile?
    let latitude: Double?
    let longitude: Double?

    var id: String { bbl }

    enum CodingKeys: String, CodingKey {
        case bbl, name, address, architect
        case yearBuilt = "year_built"
        case style, description
        case aestheticProfile = "aesthetic_profile"
        case latitude = "lat"
        case longitude = "lng"
    }
}
