import Foundation

struct Building: Identifiable, Decodable {
    let bin: String
    let bbl: String?
    let name: String?
    let address: String?
    let architect: String?
    let yearBuilt: String?
    let style: String?
    let description: String?
    let aestheticProfile: AestheticProfile?
    let latitude: Double?
    let longitude: Double?
    
    // Additional fields from schema
    let materials: String?
    let use: String?
    let type: String?
    let landmark: String?
    let historicDistrict: String?
    let borough: String?
    let primaryAesthetic: String?
    let secondaryAesthetic: String?

    var id: String { bin }

    enum CodingKeys: String, CodingKey {
        case bin, bbl, address, architect, style, landmark, borough
        case name = "building_name"
        case description = "storytelling"
        case yearBuilt = "year_built"
        case aestheticProfile = "aesthetic_profile"
        case latitude = "geocoded_lat"
        case longitude = "geocoded_lng"
        case materials = "mat_prim"
        case buildingType = "building_type"
        case historicDistrict = "historic_district"
        case primaryAesthetic = "primary_aesthetic"
        case secondaryAesthetic = "secondary_aesthetic"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle bin potentially being float/int or string in DB
        if let binInt = try? container.decode(Int.self, forKey: .bin) {
            self.bin = String(binInt)
        } else if let binDouble = try? container.decode(Double.self, forKey: .bin) {
            self.bin = String(Int(binDouble))
        } else if let binStr = try? container.decode(String.self, forKey: .bin) {
            self.bin = binStr.replacingOccurrences(of: ".0", with: "")
        } else {
            self.bin = ""
        }
        
        self.bbl = try? container.decodeIfPresent(String.self, forKey: .bbl)
        self.name = try? container.decodeIfPresent(String.self, forKey: .name)
        self.address = try? container.decodeIfPresent(String.self, forKey: .address)
        self.architect = try? container.decodeIfPresent(String.self, forKey: .architect)
        
        // Handle yearBuilt being Int or String
        if let yearInt = try? container.decode(Int.self, forKey: .yearBuilt) {
            self.yearBuilt = String(yearInt)
        } else {
            self.yearBuilt = try? container.decodeIfPresent(String.self, forKey: .yearBuilt)
        }
        
        self.style = try? container.decodeIfPresent(String.self, forKey: .style)
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        
        // Handle aestheticProfile as object or JSON string
        if let profile = try? container.decodeIfPresent(AestheticProfile.self, forKey: .aestheticProfile) {
            self.aestheticProfile = profile
        } else if let profileString = try? container.decodeIfPresent(String.self, forKey: .aestheticProfile),
                  let data = profileString.data(using: .utf8),
                  let profile = try? JSONDecoder().decode(AestheticProfile.self, from: data) {
            self.aestheticProfile = profile
        } else {
            self.aestheticProfile = nil
        }
        
        // Handle latitude/longitude potentially being String or Double
        if let latDouble = try? container.decode(Double.self, forKey: .latitude) {
            self.latitude = latDouble
        } else if let latStr = try? container.decode(String.self, forKey: .latitude), let dVal = Double(latStr) {
            self.latitude = dVal
        } else {
            self.latitude = nil
        }
        
        if let lngDouble = try? container.decode(Double.self, forKey: .longitude) {
            self.longitude = lngDouble
        } else if let lngString = try? container.decode(String.self, forKey: .longitude), let dVal = Double(lngString) {
            self.longitude = dVal
        } else {
            self.longitude = nil
        }
        
        self.materials = try? container.decodeIfPresent(String.self, forKey: .materials)
        
        // Both use and type map to building_type
        let bType = try? container.decodeIfPresent(String.self, forKey: .buildingType)
        self.use = bType
        self.type = bType
        
        self.landmark = try? container.decodeIfPresent(String.self, forKey: .landmark)
        self.historicDistrict = try? container.decodeIfPresent(String.self, forKey: .historicDistrict)
        self.borough = try? container.decodeIfPresent(String.self, forKey: .borough)
        self.primaryAesthetic = try? container.decodeIfPresent(String.self, forKey: .primaryAesthetic)
        self.secondaryAesthetic = try? container.decodeIfPresent(String.self, forKey: .secondaryAesthetic)
    }

    /// Factory method for placeholder/fallback instances
    static func placeholder(bin: String, name: String, address: String, latitude: Double? = nil, longitude: Double? = nil) -> Building {
        return Building(
            bin: bin, bbl: nil, name: name, address: address,
            architect: nil, yearBuilt: nil, style: nil, description: nil,
            aestheticProfile: nil, latitude: latitude, longitude: longitude,
            materials: nil, use: nil, type: nil, landmark: nil,
            historicDistrict: nil, borough: nil, primaryAesthetic: nil, secondaryAesthetic: nil
        )
    }

    private init(bin: String, bbl: String?, name: String?, address: String?, architect: String?, yearBuilt: String?, style: String?, description: String?, aestheticProfile: AestheticProfile?, latitude: Double?, longitude: Double?, materials: String?, use: String?, type: String?, landmark: String?, historicDistrict: String?, borough: String?, primaryAesthetic: String?, secondaryAesthetic: String?) {
        self.bin = bin
        self.bbl = bbl
        self.name = name
        self.address = address
        self.architect = architect
        self.yearBuilt = yearBuilt
        self.style = style
        self.description = description
        self.aestheticProfile = aestheticProfile
        self.latitude = latitude
        self.longitude = longitude
        self.materials = materials
        self.use = use
        self.type = type
        self.landmark = landmark
        self.historicDistrict = historicDistrict
        self.borough = borough
        self.primaryAesthetic = primaryAesthetic
        self.secondaryAesthetic = secondaryAesthetic
    }
}
