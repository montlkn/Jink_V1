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
    let heroImageUrl: String?

    var id: String { bin }

    /// Returns name if valid, otherwise falls back to address
    var displayName: String {
        let n = name ?? ""
        return (n.isEmpty || n == "0") ? (address ?? "Unknown Address") : n
    }

    enum CodingKeys: String, CodingKey {
        case bin, bbl, address, architect, style, landmark, borough
        case name = "building_name"
        case description = "storytelling"
        case yearBuilt = "year_built"
        case aestheticProfile = "normalized_profile"
        case latitude = "geocoded_lat"
        case longitude = "geocoded_lng"
        case materials = "mat_prim"
        case buildingType = "building_type"
        case historicDistrict = "historic_district"
        case primaryAesthetic = "primary_aesthetic"
        case secondaryAesthetic = "secondary_aesthetic"
        case heroImageUrl = "hero_image_url"
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
        
        // Handle bbl potentially being Int, Double, or String
        if let bblInt = try? container.decode(Int.self, forKey: .bbl) {
            self.bbl = String(bblInt)
        } else if let bblDouble = try? container.decode(Double.self, forKey: .bbl) {
            self.bbl = String(Int(bblDouble))
        } else if let bblStr = try? container.decode(String.self, forKey: .bbl) {
            self.bbl = bblStr.replacingOccurrences(of: ".0", with: "")
        } else {
            self.bbl = nil
        }
        
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
        self.heroImageUrl = try? container.decodeIfPresent(String.self, forKey: .heroImageUrl)
    }

    /// Factory method for placeholder/fallback instances
    static func placeholder(
        bin: String,
        bbl: String? = nil,
        name: String,
        address: String,
        latitude: Double? = nil,
        longitude: Double? = nil,
        primaryAesthetic: String? = nil,
        secondaryAesthetic: String? = nil,
        storytelling: String? = nil,
        style: String? = nil,
        yearBuilt: String? = nil,
        architect: String? = nil,
        materials: String? = nil,
        aestheticProfile: AestheticProfile? = nil
    ) -> Building {
        let cleanBin = bin.replacingOccurrences(of: ".0", with: "")
        let cleanBbl = bbl?.replacingOccurrences(of: ".0", with: "")
        return Building(
            bin: cleanBin, bbl: cleanBbl, name: name, address: address,
            architect: architect, yearBuilt: yearBuilt, style: style, description: storytelling,
            aestheticProfile: aestheticProfile, latitude: latitude, longitude: longitude,
            materials: materials, use: nil, type: nil, landmark: nil,
            historicDistrict: nil, borough: nil, primaryAesthetic: primaryAesthetic, secondaryAesthetic: secondaryAesthetic,
            heroImageUrl: nil
        )
    }

    private init(bin: String, bbl: String?, name: String?, address: String?, architect: String?, yearBuilt: String?, style: String?, description: String?, aestheticProfile: AestheticProfile?, latitude: Double?, longitude: Double?, materials: String?, use: String?, type: String?, landmark: String?, historicDistrict: String?, borough: String?, primaryAesthetic: String?, secondaryAesthetic: String?, heroImageUrl: String?) {
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
        self.heroImageUrl = heroImageUrl
    }
}
