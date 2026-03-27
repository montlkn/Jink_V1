import SwiftUI

// MARK: - Archetype Info Model

struct ArchetypeInfo: Identifiable {
    var id: String { name }
    let name: String
    let color: Color
    let score: Double
    let tagline: String
    let vibes: [String]
    let coreConcept: String
    let coreQualities: [(title: String, description: String)]
    let movements: [String]
    let urbanExpression: String

    static let all: [String: ArchetypeInfo] = {
        func make(_ name: String, color: Color, score: Double = 0,
                  tagline: String, vibes: [String], coreConcept: String,
                  coreQualities: [(String, String)], movements: [String], urbanExpression: String) -> ArchetypeInfo {
            ArchetypeInfo(name: name, color: color, score: score, tagline: tagline, vibes: vibes,
                          coreConcept: coreConcept,
                          coreQualities: coreQualities.map { (title: $0.0, description: $0.1) },
                          movements: movements, urbanExpression: urbanExpression)
        }
        return [
            "Classicist": make("Classicist", color: Color(hex: "#C9C8A6"),
                tagline: "Enduring Order",
                vibes: ["Formal", "Symmetrical", "Grand", "Rational", "Ornate", "Enduring"],
                coreConcept: "Embodies reverence for enduring principles of order, harmony, and grandeur inherited from Greek and Roman antiquity. Built on mathematical proportion and the belief that true beauty is timeless and rational.",
                coreQualities: [
                    ("Structural Logic", "Clear emphasis on symmetry, axial planning, and geometric purity"),
                    ("Classical Orders", "Deliberate use of Doric, Ionic, and Corinthian columns, pilasters, and entablatures"),
                    ("Architectural Elements", "Prominent use of pediments, domes, arches, and coffered ceilings"),
                    ("Refined Materiality", "Preference for noble materials that signify permanence: marble, stone, fine woods"),
                    ("Controlled Ornamentation", "Intricate but highly organized decoration, including moldings, friezes, and carved garlands"),
                ],
                movements: ["Renaissance & Palladianism", "Baroque", "Rococo", "Neoclassicism", "Beaux-Arts", "Georgian & Federal Styles"],
                urbanExpression: "Grand boulevards, formal squares, monumental civic buildings, hierarchical street networks"
            ),
            "Romantic": make("Romantic", color: Color(hex: "#DC143C"),
                tagline: "Emotion & Narrative",
                vibes: ["Expressive", "Story-Driven", "Whimsical", "Layered", "Evocative", "Atmospheric"],
                coreConcept: "Prioritizes emotion, narrative, and individualism over rational order. Finds beauty in the expressive, historical, layered, and sublime power of nature.",
                coreQualities: [
                    ("Asymmetry & Organic Forms", "Rejection of rigid symmetry in favor of natural and complex compositions"),
                    ("Historicism & Eclecticism", "Deep appreciation for history, often blending elements from different eras"),
                    ("Symbolism & Narrative", "Objects and spaces should tell stories or evoke specific moods"),
                    ("Textural Richness", "Love for opulent and tactile materials like velvet, silk, and dark carved woods"),
                    ("Atmospheric Lighting", "Preference for dramatic, moody, and varied lighting conditions"),
                ],
                movements: ["Gothic Revival", "Victorian Eclecticism", "Art Nouveau", "Bohemian & Maximalist Styles", "Dark Academia", "Cottagecore"],
                urbanExpression: "Winding medieval streets, hidden courtyards, Gothic cathedrals, picturesque neighborhoods"
            ),
            "Stylist": make("Stylist", color: Color(hex: "#FFD700"),
                tagline: "Glamour & Surface",
                vibes: ["Glamorous", "Geometric", "Luxurious", "Polished", "Confident", "Sophisticated"],
                coreConcept: "Defined by appreciation for glamour, surface, and visual rhythm. A confident and polished aesthetic that treats design as sophisticated curation.",
                coreQualities: [
                    ("Surface & Pattern", "Focus on bold, repeating geometric patterns and high-gloss surfaces"),
                    ("Polished Materiality", "Preference for sleek, reflective materials like lacquer, polished brass, chrome, and mirrored glass"),
                    ("Rhythmic Geometry", "Use of strong, repetitive motifs such as chevrons and sunbursts"),
                    ("Elegant Forms", "Preference for furniture and objects with strong, graceful silhouettes"),
                    ("Curated Compositions", "Careful arrangement and staging of elements for maximum visual impact"),
                ],
                movements: ["Art Deco", "Streamline Moderne", "Hollywood Regency", "Contemporary Luxury Design"],
                urbanExpression: "Luxury shopping districts, boutique hotels, high-end residential towers, designed nightlife districts"
            ),
            "Modernist": make("Modernist", color: Color(hex: "#0066FF"),
                tagline: "Form Follows Function",
                vibes: ["Clean", "Intentional", "Minimal", "Universal", "Functional", "Sleek", "Systematic"],
                coreConcept: "Driven by belief in universal principles, functionalism, and rejection of unnecessary ornament. A rationalist pursuit of clarity and new aesthetic for the machine age.",
                coreQualities: [
                    ("Form Follows Function", "Shape should be primarily based upon intended function"),
                    ("Rejection of Ornament", "Beauty arises from purity of form and material"),
                    ("Truth to Materials", "Honest expression of modern, industrial materials like steel, glass, and concrete"),
                    ("Visual Clarity", "Emphasis on open space, light, and logical, grid-based organization"),
                    ("Systematic Thinking", "Preference for modular, repeatable systems and standardized solutions"),
                ],
                movements: ["Bauhaus", "International Style", "De Stijl", "Minimalism", "Super Normal Design", "Contemporary Minimalism"],
                urbanExpression: "Glass office towers, modernist housing estates, clean transit systems, rational street grids"
            ),
            "Industrialist": make("Industrialist", color: Color(hex: "#FF8C00"),
                tagline: "Raw & Authentic",
                vibes: ["Raw", "Utilitarian", "Edgy", "Exposed", "Functional", "Urban", "Authentic"],
                coreConcept: "Finds beauty in the raw, utilitarian, and exposed. Values honesty, durability, and character that comes from use and age.",
                coreQualities: [
                    ("Exposure of Structure", "Celebration of exposed brick, ductwork, and structural beams"),
                    ("Utilitarian Forms", "Preference for objects designed for function, often from factories or workshops"),
                    ("Patina & Wear", "Appreciation for materials that show their history, like weathered wood and aged metal"),
                    ("Functional Honesty", "Authentic expression of mechanical systems and infrastructure"),
                    ("Adaptive Reuse", "Finding beauty in converted warehouses, repurposed materials, and industrial heritage"),
                ],
                movements: ["Industrial Heritage", "Loft Living", "Adaptive Reuse", "Warehouse Conversion"],
                urbanExpression: "Converted warehouses, exposed infrastructure, industrial districts, working waterfronts, power plants, bridges, transit hubs"
            ),
            "Visionary": make("Visionary", color: Color(hex: "#00FFFF"),
                tagline: "Beyond Boundaries",
                vibes: ["Sculptural", "Unconventional", "Dynamic", "Bold", "Innovative", "Playful", "Experimental"],
                coreConcept: "Defined by relentless drive to push boundaries, experiment with form, and speculate on the future. Leverages new technologies to create sculptural, dynamic, previously unimaginable designs.",
                coreQualities: [
                    ("Formal Experimentation", "Rejection of traditional forms in favor of fragmentation and complexity"),
                    ("Conceptual Depth", "Design driven by strong theoretical or philosophical ideas"),
                    ("Technological Integration", "Use of cutting-edge technology like digital modeling and AI to generate complex forms"),
                    ("Boundary Pushing", "Willingness to challenge conventions and propose radical alternatives"),
                    ("Future-Oriented", "Designs that anticipate or provoke new ways of living"),
                ],
                movements: ["Deconstructivism", "Parametricism", "Postmodernism", "Blob Architecture", "Digital Architecture", "Critical Architecture"],
                urbanExpression: "Iconic cultural buildings, experimental housing, tech campuses, futuristic transit hubs"
            ),
            "Pop Culturalist": make("Pop Culturalist", color: Color(hex: "#FF1493"),
                tagline: "Spectacle & Symbol",
                vibes: ["Thematic", "Iconic", "Commercial", "Ironic", "Spectacular", "Theatrical", "Accessible"],
                coreConcept: "Engages with aesthetics of commercialism, mass media, and spectacle, often with theatricality and irony. Uses design to communicate familiar symbols and create immediately legible experiences.",
                coreQualities: [
                    ("Use of Semiotics", "Deployment of recognizable signs, logos, and icons from mass culture"),
                    ("Spectacle & Theming", "Creation of immersive, often exaggerated, narrative environments"),
                    ("Commercial Integration", "Design unapologetically linked to commerce and entertainment"),
                    ("Irony & Kitsch", "Playful, often critical, embrace of popular taste and nostalgia"),
                    ("Immediate Legibility", "Designs that communicate quickly and clearly to broad audiences"),
                ],
                movements: ["Pop Art Architecture", "Postmodern Classicism", "Googie Architecture", "Entertainment Architecture", "Branded Environments"],
                urbanExpression: "Times Square, Las Vegas Strip, theme parks, shopping malls, entertainment districts"
            ),
            "Vernacularist": make("Vernacularist", color: Color(hex: "#32CD32"),
                tagline: "Rooted & Regional",
                vibes: ["Rooted", "Climatic", "Communal", "Tactile", "Intuitive", "Regional", "Sustainable"],
                coreConcept: "Champions localized, indigenous, and community-born design traditions developed outside elite academic structures. Foregrounds cultural continuity, climatic intelligence, and embodied knowledge.",
                coreQualities: [
                    ("Embodied Knowledge", "Techniques and forms passed through oral tradition or apprenticeship"),
                    ("Material Localism", "Use of regional materials like mud, thatch, local stone, and indigenous woods"),
                    ("Climatic Intelligence", "Passive design strategies that respond to local environment"),
                    ("Socio-Spatial Integration", "Strong relationship between space design and community life rhythms"),
                    ("Cultural Continuity", "Respect for traditional building methods and local craft traditions"),
                ],
                movements: ["Indigenous Architectures", "Critical Regionalism", "Tropical Modernism", "Mud/Adobe/Rammed Earth Traditions", "Sustainable Design"],
                urbanExpression: "Historic neighborhoods, local markets, craft districts, sustainable communities, cultural quarters"
            ),
            "Austerist": make("Austerist", color: Color(hex: "#95A5A6"),
                tagline: "Pure Efficiency",
                vibes: ["Efficient", "Systematic", "Practical", "Standardized", "Functional", "Universal", "Cost-Conscious"],
                coreConcept: "Efficiency-driven design optimized for function, cost, and standardization. Represents the pragmatic backbone of the built environment through systematic, no-frills solutions.",
                coreQualities: [
                    ("Optimized Functionality", "Maximum utility with minimum resources and complexity"),
                    ("Standardized Systems", "Reliance on proven, mass-produced components and catalogued solutions"),
                    ("Cost-Conscious Solutions", "Design driven by economic efficiency and value engineering"),
                    ("Universal Accessibility", "Focus on meeting codes, standards, and basic human needs"),
                    ("Systematic Organization", "Spaces organized by logical constraints: circulation, fire codes, zoning"),
                ],
                movements: ["Corporate Architecture", "Big-Box Retail", "Institutional Design", "Public Housing", "Standard Office Buildings"],
                urbanExpression: "Business parks, strip malls, apartment complexes, institutional buildings, suburban office parks"
            ),
        ]
    }()
}
