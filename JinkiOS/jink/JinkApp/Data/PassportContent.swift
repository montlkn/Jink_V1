import Foundation
import CoreLocation

// MARK: - Stamp Definitions

struct StampDefinition: Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String
    let rarity: StampRarity
    let series: String
}

enum StampRarity: String {
    case common, rare, epic, legendary

    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Achievement Definitions

struct AchievementDefinition: Identifiable {
    let id: String
    let title: String
    let description: String
    let xpReward: Int
    let icon: String
    let isMissable: Bool
    let verificationText: String?
}


// MARK: - Passport List Definitions

struct PassportListBuilding: Identifiable {
    let id: String
    let bin: String
    let name: String
    let address: String
    let latitude: Double
    let longitude: Double
}

struct PassportListDefinition: Identifiable {
    let id: String
    let name: String
    let tagline: String
    let mood: String
    let buildings: [PassportListBuilding]
}

// MARK: - Tour Definitions

enum CheckpointType: String {
    case building, waypoint, viewpoint
}

struct TourCheckpoint: Identifiable {
    let id: String
    let type: CheckpointType
    let name: String
    let latitude: Double
    let longitude: Double
    let narrative: String
    let funFact: String
    let action: String
    let bin: String?
    let address: String?
}

struct TourDefinition: Identifiable, Hashable {
    static func == (lhs: TourDefinition, rhs: TourDefinition) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    let id: String
    let name: String
    let subtitle: String
    let difficulty: String
    let durationMinutes: Int
    let distanceMiles: Double
    let xpReward: Int
    let badgeId: String
    let badgeName: String
    let checkpoints: [TourCheckpoint]
    let summaryText: String
}

// MARK: - Static Content

enum PassportContent {

    // MARK: Stamps
    static let stampCollection: [StampDefinition] = [
        StampDefinition(
            id: "flatiron_first_scan",
            slug: "flatiron_first_scan",
            title: "Flatiron First Scan",
            description: "You scanned the iconic Flatiron Building — a true NYC landmark.",
            rarity: .common,
            series: "building"
        ),
        StampDefinition(
            id: "quest_midtown_marvels",
            slug: "quest_midtown_marvels",
            title: "Quest: Midtown Marvels",
            description: "Completed the Midtown Marvels quest and earned your place in history.",
            rarity: .rare,
            series: "quest"
        ),
        StampDefinition(
            id: "achievement_first_scan",
            slug: "achievement_first_scan",
            title: "Achievement: First Scan",
            description: "You scanned your very first building. The city is your oyster.",
            rarity: .common,
            series: "achievement"
        ),
        StampDefinition(
            id: "ticker_tape_legend",
            slug: "ticker_tape_legend",
            title: "Ticker Tape Legend",
            description: "You walked the historic route of NYC's ticker-tape parade corridor.",
            rarity: .epic,
            series: "building"
        ),
        StampDefinition(
            id: "quest_dumbo_steel",
            slug: "quest_dumbo_steel",
            title: "Quest: DUMBO Steel",
            description: "Navigated DUMBO's industrial waterfront and lived to tell the tale.",
            rarity: .rare,
            series: "quest"
        ),
        StampDefinition(
            id: "aia_open_house",
            slug: "aia_open_house",
            title: "AIA Open House",
            description: "Attended AIA Open House NYC and explored behind closed doors.",
            rarity: .epic,
            series: "building"
        ),
        StampDefinition(
            id: "achievement_perfect_week",
            slug: "achievement_perfect_week",
            title: "Achievement: Perfect Week",
            description: "Scanned buildings every day for a full week. Dedication personified.",
            rarity: .legendary,
            series: "achievement"
        ),
        StampDefinition(
            id: "collection_master",
            slug: "collection_master",
            title: "Collection Master",
            description: "Collected every stamp in a complete series. Legendary explorer.",
            rarity: .legendary,
            series: "achievement"
        ),
    ]

    // MARK: Achievements
    static let achievementLedger: [AchievementDefinition] = [
        AchievementDefinition(
            id: "first_scan",
            title: "First Scan",
            description: "Scan your first building",
            xpReward: 25,
            icon: "camera.viewfinder",
            isMissable: false,
            verificationText: "Automatically verified on first scan"
        ),
        AchievementDefinition(
            id: "100_scans",
            title: "Century Scanner",
            description: "Scan 100 buildings",
            xpReward: 500,
            icon: "building.2.fill",
            isMissable: false,
            verificationText: "Verified by scan count"
        ),
        AchievementDefinition(
            id: "style_explorer_modern",
            title: "Style Explorer: Modern",
            description: "Scan 10 modernist buildings",
            xpReward: 200,
            icon: "square.stack.3d.up.fill",
            isMissable: false,
            verificationText: "Verified by archetype scans"
        ),
        AchievementDefinition(
            id: "dedicated_traveler",
            title: "Dedicated Traveler",
            description: "Complete 5 walks",
            xpReward: 200,
            icon: "figure.walk",
            isMissable: false,
            verificationText: "Verified by walk count"
        ),
        AchievementDefinition(
            id: "perfect_week",
            title: "Perfect Week",
            description: "Scan every day for 7 days in a row",
            xpReward: 1200,
            icon: "calendar.badge.checkmark",
            isMissable: true,
            verificationText: "Must maintain 7-day streak"
        ),
        AchievementDefinition(
            id: "dawn_scanner",
            title: "Dawn Scanner",
            description: "Scan a building before 7am",
            xpReward: 150,
            icon: "sunrise.fill",
            isMissable: true,
            verificationText: "Verified by scan timestamp"
        ),
        AchievementDefinition(
            id: "collection_champion",
            title: "Collection Champion",
            description: "Complete all stamps in a series",
            xpReward: 10000,
            icon: "star.circle.fill",
            isMissable: true,
            verificationText: "Verified by stamp completion"
        ),
    ]


    // MARK: Passport Lists
    static let passportLists: [PassportListDefinition] = [
        PassportListDefinition(
            id: "deco_giants",
            name: "Deco Giants",
            tagline: "The gilded peaks of Manhattan",
            mood: "Opulent",
            buildings: [
                PassportListBuilding(id: "chrysler", bin: "1001830", name: "Chrysler Building", address: "405 Lexington Ave", latitude: 40.7516, longitude: -73.9755),
                PassportListBuilding(id: "empire_state", bin: "1001028", name: "Empire State Building", address: "350 Fifth Ave", latitude: 40.7484, longitude: -73.9857),
                PassportListBuilding(id: "rockefeller", bin: "1001830", name: "30 Rockefeller Plaza", address: "30 Rockefeller Plaza", latitude: 40.7587, longitude: -73.9787),
                PassportListBuilding(id: "one_wall_st", bin: "1000484", name: "One Wall Street", address: "1 Wall St", latitude: 40.7071, longitude: -74.0121),
                PassportListBuilding(id: "woolworth", bin: "1001831", name: "Woolworth Building", address: "233 Broadway", latitude: 40.7128, longitude: -74.0080),
            ]
        ),
        PassportListDefinition(
            id: "industrial_poetics",
            name: "Industrial Poetics",
            tagline: "Where iron meets sky",
            mood: "Raw",
            buildings: [
                PassportListBuilding(id: "high_line_1", bin: "1008882", name: "Standard High Line", address: "848 Washington St", latitude: 40.7393, longitude: -74.0084),
                PassportListBuilding(id: "chelsea_market", bin: "1008390", name: "Chelsea Market", address: "75 9th Ave", latitude: 40.7424, longitude: -74.0044),
                PassportListBuilding(id: "domino", bin: "3007685", name: "Domino Sugar Factory", address: "1 S 1st St, Brooklyn", latitude: 40.7140, longitude: -73.9625),
                PassportListBuilding(id: "brooklyn_navy", bin: "3050000", name: "Brooklyn Navy Yard", address: "63 Flushing Ave, Brooklyn", latitude: 40.6982, longitude: -73.9732),
            ]
        ),
        PassportListDefinition(
            id: "brutalist_beacons",
            name: "Brutalist Beacons",
            tagline: "Concrete poetry in motion",
            mood: "Bold",
            buildings: [
                PassportListBuilding(id: "ford_foundation", bin: "1001893", name: "Ford Foundation Building", address: "320 E 43rd St", latitude: 40.7505, longitude: -73.9739),
                PassportListBuilding(id: "bobst", bin: "1009847", name: "Bobst Library NYU", address: "70 Washington Square S", latitude: 40.7294, longitude: -73.9977),
                PassportListBuilding(id: "paul_hall", bin: "1009000", name: "Paul Hall Center", address: "17 Battery Pl", latitude: 40.7032, longitude: -74.0145),
                PassportListBuilding(id: "breuer", bin: "1001640", name: "Whitney Museum (Breuer)", address: "945 Madison Ave", latitude: 40.7729, longitude: -73.9634),
            ]
        ),
        PassportListDefinition(
            id: "seaside_escape",
            name: "Seaside Escape",
            tagline: "Where the city meets the water",
            mood: "Serene",
            buildings: [
                PassportListBuilding(id: "battery_park_1", bin: "1000001", name: "Castle Clinton", address: "Battery Park", latitude: 40.7034, longitude: -74.0170),
                PassportListBuilding(id: "pier17", bin: "1000002", name: "Pier 17", address: "89 South St", latitude: 40.7062, longitude: -74.0030),
                PassportListBuilding(id: "brooklyn_heights", bin: "3000100", name: "Brooklyn Heights Promenade", address: "Columbia Heights, Brooklyn", latitude: 40.6960, longitude: -73.9965),
                PassportListBuilding(id: "governors_island", bin: "5000100", name: "Fort Jay", address: "Governors Island", latitude: 40.6900, longitude: -74.0166),
            ]
        ),
    ]
}
