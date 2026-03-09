import SwiftUI

// MARK: - Profile Detail View

struct ProfileDetailView: View {
    let profile: Profile
    let aestheticProfile: AestheticProfile
    @Environment(\.dismiss) var dismiss
    @State private var selectedArchetype: ArchetypeInfo? = nil
    @State private var showQuiz = false

    var sortedArchetypes: [(name: String, score: Double, color: Color)] {
        aestheticProfile.all.sorted { $0.score > $1.score }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Orb
                    ArchetypeOrb(aesthetic: aestheticProfile)
                        .padding(.top, 8)

                    // AI Summary
                    VStack(spacing: 10) {
                        Text("Your Aesthetic Profile")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text("Your architectural sensibility blends \(sortedArchetypes.prefix(2).map(\.name).joined(separator: " and ")) influences — drawn to spaces that balance form with meaning.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.horizontal)

                    // Primary + Secondary cards
                    ForEach(sortedArchetypes.prefix(2).indices, id: \.self) { idx in
                        let arch = sortedArchetypes[idx]
                        let info = ArchetypeInfo.all[arch.name]
                        ArchetypeCardView(
                            name: arch.name,
                            tagline: info?.tagline ?? "",
                            vibes: info?.vibes ?? [],
                            color: arch.color,
                            score: arch.score
                        )
                        .onTapGesture {
                            if let info = info {
                                selectedArchetype = ArchetypeInfo(
                                    name: arch.name, color: arch.color, score: arch.score,
                                    tagline: info.tagline, vibes: info.vibes,
                                    coreConcept: info.coreConcept, coreQualities: info.coreQualities,
                                    movements: info.movements, urbanExpression: info.urbanExpression
                                )
                            }
                        }
                    }

                    // Full list
                    VStack(spacing: 12) {
                        Text("All Archetypes")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                        VStack(spacing: 8) {
                            ForEach(sortedArchetypes.indices, id: \.self) { idx in
                                let arch = sortedArchetypes[idx]
                                Button {
                                    if let info = ArchetypeInfo.all[arch.name] {
                                        selectedArchetype = ArchetypeInfo(
                                            name: arch.name, color: arch.color, score: arch.score,
                                            tagline: info.tagline, vibes: info.vibes,
                                            coreConcept: info.coreConcept, coreQualities: info.coreQualities,
                                            movements: info.movements, urbanExpression: info.urbanExpression
                                        )
                                    }
                                } label: {
                                    ArchetypeRowView(name: arch.name, score: arch.score, color: arch.color)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }

                    Divider().padding(.horizontal)

                    // Retake quiz
                    Button {
                        showQuiz = true
                    } label: {
                        Label("Retake Aesthetic Quiz", systemImage: "arrow.counterclockwise")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)
                    .padding(.bottom, 32)
                }
                .padding(.vertical, 16)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(item: $selectedArchetype) { info in
                ArchetypeDetailSheet(info: info)
            }
            .sheet(isPresented: $showQuiz) {
                OnboardingQuizView()
            }
        }
    }
}

// MARK: - Quiz Placeholder

struct QuizPlaceholderView: View {
    @Environment(\.dismiss) var dismiss
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "questionmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(AppColors.accent)
                Text("Aesthetic Quiz")
                    .font(.largeTitle.bold())
                Text("The quiz is coming soon. Scan buildings and go on walks to build your aesthetic profile in the meantime.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Quiz")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

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

// MARK: - Archetype Detail Sheet

struct ArchetypeDetailSheet: View {
    let info: ArchetypeInfo
    @Environment(\.dismiss) var dismiss

    @State private var personalBio: String? = nil
    @State private var loadingBio = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero header
                    ZStack(alignment: .bottomLeading) {
                        LinearGradient(
                            colors: [info.color, info.color.opacity(0.4)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)

                        VStack(alignment: .leading, spacing: 6) {
                            Text(info.tagline.uppercased())
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.75))
                                .tracking(2)
                            Text(info.name)
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)
                            Text(String(format: "%.0f%% affinity", info.score * 100))
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.85))
                        }
                        .padding(20)
                    }

                    VStack(spacing: 24) {
                        // Vibe tags
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(info.vibes, id: \.self) { vibe in
                                    Text(vibe)
                                        .font(.caption.bold())
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(info.color.opacity(0.15), in: Capsule())
                                        .foregroundStyle(info.color)
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.top, 20)

                        // Core concept
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Core Concept")
                                .font(.headline)
                            Text(info.coreConcept)
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)

                        // Personal bio (Gemini-generated)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your Profile")
                                .font(.headline)
                            if let bio = personalBio {
                                Text(bio)
                                    .font(.body)
                                    .foregroundStyle(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            } else if loadingBio {
                                HStack(spacing: 8) {
                                    ProgressView().scaleEffect(0.75)
                                    Text("Generating your profile…")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)

                        // Score bar
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your Affinity")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(info.color.opacity(0.2))
                                    Capsule().fill(info.color)
                                        .frame(width: geo.size.width * info.score)
                                }
                                .frame(height: 8)
                            }
                            .frame(height: 8)
                        }
                        .padding(.horizontal)

                        // Core qualities
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Core Qualities")
                                .font(.headline)
                                .padding(.horizontal)
                            ForEach(info.coreQualities.indices, id: \.self) { i in
                                let q = info.coreQualities[i]
                                HStack(alignment: .top, spacing: 12) {
                                    Circle()
                                        .fill(info.color)
                                        .frame(width: 6, height: 6)
                                        .padding(.top, 5)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(q.title).font(.subheadline.bold())
                                        Text(q.description).font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }

                        // Related movements
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Related Movements")
                                .font(.headline)
                                .padding(.horizontal)
                            FlowLayout(spacing: 8) {
                                ForEach(info.movements, id: \.self) { m in
                                    Text(m)
                                        .font(.caption)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color(.secondarySystemBackground), in: Capsule())
                                        .foregroundStyle(.primary)
                                }
                            }
                            .padding(.horizontal)
                        }

                        // Urban expression
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Urban Expression")
                                .font(.headline)
                            Text(info.urbanExpression)
                                .font(.body)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                        .padding(.bottom, 32)
                    }
                }
            }
            .ignoresSafeArea(edges: .top)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
        }
        .task(id: info.name) {
            guard info.score > 0 else { return }
            loadingBio = true
            let prompt = """
            Write 2 sentences (max 40 words total) describing what it means that someone has \(Int(info.score * 100))% affinity \
            for \(info.name) architecture. Be personal and specific — mention the \(info.vibes.prefix(3).joined(separator: ", ")) qualities \
            they're drawn to. Speak directly to them ("You are drawn to…").
            """
            personalBio = await GeminiService.generate(prompt: prompt, maxTokens: 100, temperature: 0.75)
            loadingBio = false
        }
    }
}

// MARK: - FlowLayout (wrapping HStack)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 300
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX && x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
    }
}

// MARK: - Card & Row (reused)

struct ArchetypeCardView: View {
    let name: String
    let tagline: String
    let vibes: [String]
    let color: Color
    let score: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Circle().fill(color).frame(width: 12, height: 12)
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).font(.headline)
                    Text(String(format: "%.0f%% affinity", score * 100))
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
            }

            // Vibe pills (first 3)
            HStack(spacing: 6) {
                ForEach(vibes.prefix(3), id: \.self) { v in
                    Text(v).font(.caption2.bold())
                        .padding(.horizontal, 7).padding(.vertical, 3)
                        .background(color.opacity(0.15), in: Capsule())
                        .foregroundStyle(color)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(color.opacity(0.2))
                    Capsule().fill(color).frame(width: geo.size.width * score)
                }
                .frame(height: 6)
            }
            .frame(height: 6)
        }
        .padding(16)
        .background(color.opacity(0.08))
        .cornerRadius(14)
        .padding(.horizontal)
    }
}

struct ArchetypeRowView: View {
    let name: String
    let score: Double
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(name).font(.subheadline)
                Spacer()
                Text(String(format: "%.0f%%", score * 100))
                    .font(.caption.bold()).foregroundStyle(color)
                Image(systemName: "chevron.right").font(.caption2).foregroundStyle(.tertiary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(color.opacity(0.15))
                    Capsule().fill(color).frame(width: geo.size.width * score)
                }
                .frame(height: 4)
            }
            .frame(height: 4)
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
