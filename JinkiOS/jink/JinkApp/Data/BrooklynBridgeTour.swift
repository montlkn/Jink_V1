import Foundation
import CoreLocation

// MARK: - Brooklyn Bridge Tour Data

extension PassportContent {

    static let brooklynBridgeTour = TourDefinition(
        id: "brooklyn-bridge-financial",
        name: "Brooklyn Bridge to Financial District",
        subtitle: "Bridges, Towers & Civic Grandeur",
        difficulty: "Moderate",
        durationMinutes: 60,
        distanceMiles: 2.1,
        xpReward: 500,
        badgeId: "brooklyn-bridge-pioneer",
        badgeName: "Bridge Pioneer",
        checkpoints: [
            TourCheckpoint(
                id: "start-brooklyn-bridge",
                type: .waypoint,
                name: "Brooklyn Bridge Entrance",
                latitude: 40.7056,
                longitude: -73.9969,
                narrative: "You stand at the threshold of one of engineering's greatest triumphs. The Brooklyn Bridge, completed in 1883, was the longest suspension bridge in the world at the time. Its gothic stone towers rise 276 feet above the East River.",
                funFact: "The bridge took 14 years to build and cost the lives of 27 workers, including the bridge's original engineer, John Roebling, who died from an infection after a ferry accident at the site.",
                action: "Continue",
                bin: nil,
                address: "Brooklyn Bridge Pedestrian Walkway"
            ),
            TourCheckpoint(
                id: "midspan-viewpoint",
                type: .viewpoint,
                name: "Mid-Span Skyline View",
                latitude: 40.7061,
                longitude: -74.0019,
                narrative: "Pause here at the midpoint of the bridge. The panorama before you spans centuries of architectural ambition — from the Woolworth's Gothic crown to the sleek tower of 1 World Trade Center. This view has inspired painters, photographers, and poets for over a century.",
                funFact: "On a clear day from this vantage point, you can identify the Woolworth Building, Municipal Building, and 1 World Trade Center — three generations of NYC's tallest buildings, each the tallest in the world when completed.",
                action: "Continue",
                bin: nil,
                address: "Brooklyn Bridge — Mid-Span"
            ),
            TourCheckpoint(
                id: "brooklyn-tower",
                type: .waypoint,
                name: "Brooklyn Tower Gothic Arches",
                latitude: 40.7057,
                longitude: -73.9969,
                narrative: "Stand beneath the soaring gothic arches of the Brooklyn Tower. The pointed arches and masonry texture echo the great cathedrals of Europe — a deliberate choice by the Roeblings to elevate the bridge beyond mere infrastructure into civic monument.",
                funFact: "The masonry of each tower contains more stone than the Great Pyramid of Giza. The towers are hollow — engineers built wine cellars inside them in the 1940s, which are still there today.",
                action: "Continue",
                bin: nil,
                address: "Brooklyn Bridge — Brooklyn Tower"
            ),
            TourCheckpoint(
                id: "woolworth-building",
                type: .building,
                name: "Woolworth Building",
                latitude: 40.7128,
                longitude: -74.0080,
                narrative: "Completed in 1913, Cass Gilbert's 'Cathedral of Commerce' stood as the world's tallest building until 1930. F.W. Woolworth paid $13.5 million in cash — no mortgage — to build it. The Gothic terracotta facade bristles with gargoyles and grotesques, each telling a story of commerce and ambition.",
                funFact: "At the building's dedication, President Woodrow Wilson pressed a button in the White House that illuminated 80,000 electric light bulbs, making the skyscraper glow like a beacon across lower Manhattan.",
                action: "Scan to Verify",
                bin: "1001831",
                address: "233 Broadway, Manhattan"
            ),
            TourCheckpoint(
                id: "municipal-building",
                type: .building,
                name: "Manhattan Municipal Building",
                latitude: 40.7128,
                longitude: -74.0051,
                narrative: "McKim, Mead & White's 1914 masterpiece straddles Chambers Street on a massive granite base. The building houses 25 city agencies and 8,000 municipal workers. Its crowning figure, 'Civic Fame' by Adolph Weinman, stands 25 feet tall and was the first large-scale gilded statue erected in New York.",
                funFact: "The building's arch over Chambers Street was the first in New York to span a street — the street was built through the arch, not the arch around the street. It contains its own subway entrance in the basement.",
                action: "Scan to Verify",
                bin: "1001092",
                address: "1 Centre St, Manhattan"
            ),
            TourCheckpoint(
                id: "city-hall",
                type: .building,
                name: "New York City Hall",
                latitude: 40.7128,
                longitude: -74.0059,
                narrative: "Completed in 1811, City Hall is the oldest city hall in the US still in its original function. Its Federal-style architecture, with its marble facade and elegant cupola, was considered so far north of the city's population that the rear of the building was left unfinished in brownstone — a costly miscalculation.",
                funFact: "When City Hall was built, its rear was intentionally left unfinished since planners thought the city would never grow further north. The building was finally faced in marble in 1954 when the original brownstone deteriorated.",
                action: "Scan to Verify",
                bin: "1001093",
                address: "City Hall Park, Manhattan"
            ),
            TourCheckpoint(
                id: "tweed-courthouse",
                type: .building,
                name: "Tweed Courthouse",
                latitude: 40.7131,
                longitude: -74.0061,
                narrative: "This Italianate-Renaissance courthouse, begun in 1862, became infamous as the symbol of political corruption. Boss Tweed and his Tammany Hall machine siphoned $13 million from the $12 million budget. The building took 10 years to complete and the contractor reportedly made $5 from every $6 spent.",
                funFact: "Despite its corrupt origins, the courthouse is architecturally magnificent. After a $85 million restoration, it now houses the Department of Education. The building appeared in Martin Scorsese's 'Gangs of New York.'",
                action: "Scan to Verify",
                bin: "1001094",
                address: "52 Chambers St, Manhattan"
            ),
            TourCheckpoint(
                id: "federal-hall",
                type: .building,
                name: "Federal Hall",
                latitude: 40.7071,
                longitude: -74.0102,
                narrative: "On this site, George Washington was inaugurated as the first President of the United States on April 30, 1789. The current Greek Revival structure, built in 1842, served as the Custom House and later the US Sub-Treasury. The massive Doric columns and commanding statue of Washington make it one of Wall Street's most iconic landmarks.",
                funFact: "The original Federal Hall, where Washington was inaugurated, was demolished in 1812. The current building was constructed on the same site and reuses some of the same granite. The balcony where Washington stood is commemorated by the bronze statue.",
                action: "Scan to Verify",
                bin: "1000477",
                address: "26 Wall St, Manhattan"
            ),
            TourCheckpoint(
                id: "trinity-church",
                type: .building,
                name: "Trinity Church",
                latitude: 40.7081,
                longitude: -74.0116,
                narrative: "Trinity Church, consecrated in 1846, was the tallest structure in New York City until 1869. Richard Upjohn's Gothic Revival masterpiece in brownstone has presided over Wall Street for over 175 years. Alexander Hamilton is buried in the churchyard, alongside Robert Fulton, inventor of the steamboat.",
                funFact: "The original Trinity Church, built in 1698, burned down in the Great Fire of 1776 during the British occupation. The current building, the third on this site, contains windows by Richard Morris Hunt and a bronze door panel designed by architect Karl Bitter.",
                action: "Scan to Verify",
                bin: "1000483",
                address: "75 Broadway, Manhattan"
            ),
            TourCheckpoint(
                id: "one-wall-street",
                type: .building,
                name: "One Wall Street",
                latitude: 40.7071,
                longitude: -74.0121,
                narrative: "Ralph Walker's 1931 Art Deco tower represents the zenith of skyscraper design before the Depression ended New York's great building boom. The limestone facade graduates from dark at the base to creamy white at the top. The lobby's Red Room, sheathed in blood-red mosaic tiles with gold leaf trim, is one of the finest Art Deco interiors in the city.",
                funFact: "The building was home to Irving Trust Company for decades. After a $1.5 billion conversion by Macklowe Properties, it reopened in 2021 as luxury condominiums — the largest residential conversion in NYC history at the time.",
                action: "Scan to Verify",
                bin: "1000484",
                address: "1 Wall St, Manhattan"
            ),
        ],
        summaryText: "You've traversed one of New York City's most storied architectural corridors — from the gothic grandeur of the Brooklyn Bridge to the Art Deco peaks of the Financial District. Each building you visited was once the tallest, the grandest, or the most controversial structure in the city. You now carry their stories."
    )

    static let allTours: [TourDefinition] = [brooklynBridgeTour]
}

// MARK: - Tour Helpers

func tourBuildingByLocation(tour: TourDefinition, latitude: Double, longitude: Double, radiusMeters: Double = 30) -> TourCheckpoint? {
    let userLocation = CLLocation(latitude: latitude, longitude: longitude)
    return tour.checkpoints.first { checkpoint in
        let checkpointLocation = CLLocation(latitude: checkpoint.latitude, longitude: checkpoint.longitude)
        return userLocation.distance(from: checkpointLocation) <= radiusMeters
    }
}
