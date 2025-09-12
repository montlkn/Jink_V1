export const getDetailedArchetypeInfo = (archetypeName) => {
  const archetypeData = {
    'classicist': {
      name: 'The Classicist',
      coreConcept: 'Embodies reverence for enduring principles of order, harmony, and grandeur inherited from Greek and Roman antiquity. Built on mathematical proportion and the belief that true beauty is timeless and rational.',
      vibe: ['Formal', 'Symmetrical', 'Grand', 'Rational', 'Ornate', 'Enduring'],
      coreQualities: [
        'Structural Logic: Clear emphasis on symmetry, axial planning, and geometric purity',
        'Classical Orders: Deliberate use of Doric, Ionic, and Corinthian columns, pilasters, and entablatures',
        'Architectural Elements: Prominent use of pediments, domes, arches, and coffered ceilings',
        'Refined Materiality: Preference for noble materials that signify permanence: marble, stone, fine woods',
        'Controlled Ornamentation: Intricate but highly organized decoration, including moldings, friezes, and carved garlands'
      ],
      umbrellaMovements: ['Renaissance & Palladianism', 'Baroque', 'Rococo', 'Neoclassicism', 'Beaux-Arts', 'Georgian & Federal Styles'],
      urbanExpression: 'Grand boulevards, formal squares, monumental civic buildings, hierarchical street networks',
      color: '#8B4513'
    },
    'romantic': {
      name: 'The Romantic',
      coreConcept: 'Prioritizes emotion, narrative, and individualism over rational order. Finds beauty in the expressive, historical, layered, and sublime power of nature.',
      vibe: ['Expressive', 'Story-Driven', 'Whimsical', 'Layered', 'Evocative', 'Atmospheric'],
      coreQualities: [
        'Asymmetry and Organic Forms: Rejection of rigid symmetry in favor of natural and complex compositions',
        'Historicism and Eclecticism: Deep appreciation for history, often blending elements from different eras',
        'Symbolism and Narrative: Objects and spaces should tell stories or evoke specific moods',
        'Textural Richness: Love for opulent and tactile materials like velvet, silk, chintz, and dark carved woods',
        'Atmospheric Lighting: Preference for dramatic, moody, and varied lighting conditions'
      ],
      umbrellaMovements: ['Gothic Revival', 'Victorian Eclecticism', 'Art Nouveau', 'Bohemian & Maximalist Styles', 'Dark Academia', 'Cottagecore'],
      urbanExpression: 'Winding medieval streets, hidden courtyards, Gothic cathedrals, picturesque neighborhoods',
      color: '#8B008B'
    },
    'stylist': {
      name: 'The Stylist',
      coreConcept: 'Defined by appreciation for glamour, surface, and visual rhythm. A confident and polished aesthetic that treats design as sophisticated curation.',
      vibe: ['Glamorous', 'Geometric', 'Luxurious', 'Polished', 'Confident', 'Sophisticated'],
      coreQualities: [
        'Emphasis on Surface and Pattern: Focus on bold, repeating geometric patterns and high-gloss surfaces',
        'Polished Materiality: Preference for sleek, reflective materials like lacquer, polished brass, chrome, and mirrored glass',
        'Rhythmic Geometry: Use of strong, repetitive motifs such as chevrons and sunbursts',
        'Elegant Forms: Preference for furniture and objects with strong, graceful silhouettes',
        'Curated Compositions: Careful arrangement and staging of elements for maximum visual impact'
      ],
      umbrellaMovements: ['Art Deco', 'Streamline Moderne', 'Hollywood Regency', 'Contemporary Luxury Design'],
      urbanExpression: 'Luxury shopping districts, boutique hotels, high-end residential towers, designed nightlife districts',
      color: '#FFD700'
    },
    'modernist': {
      name: 'The Modernist',
      coreConcept: 'Driven by belief in universal principles, functionalism, and rejection of unnecessary ornament. A rationalist pursuit of clarity and new aesthetic for the machine age.',
      vibe: ['Clean', 'Intentional', 'Minimal', 'Universal', 'Functional', 'Sleek', 'Systematic'],
      coreQualities: [
        'Form Follows Function: Shape should be primarily based upon intended function',
        'Rejection of Ornament: Beauty arises from purity of form and material',
        'Truth to Materials: Honest expression of modern, industrial materials like steel, glass, and concrete',
        'Visual Clarity: Emphasis on open space, light, and logical, grid-based organization',
        'Systematic Thinking: Preference for modular, repeatable systems and standardized solutions'
      ],
      umbrellaMovements: ['Bauhaus', 'International Style', 'De Stijl', 'Minimalism', 'Super Normal Design', 'Contemporary Minimalism'],
      urbanExpression: 'Glass office towers, modernist housing estates, clean transit systems, rational street grids',
      color: '#708090'
    },
    'industrialist': {
      name: 'The Industrialist',
      coreConcept: 'Finds beauty in the raw, utilitarian, and exposed. Values honesty, durability, and character that comes from use and age.',
      vibe: ['Raw', 'Utilitarian', 'Edgy', 'Exposed', 'Functional', 'Urban', 'Authentic'],
      coreQualities: [
        'Exposure of Structure: Celebration of exposed brick, ductwork, and structural beams',
        'Utilitarian Forms: Preference for objects designed for function, often from factories or workshops',
        'Patina and Wear: Appreciation for materials that show their history, like weathered wood and aged metal',
        'Functional Honesty: Authentic expression of mechanical systems and infrastructure',
        'Adaptive Reuse: Finding beauty in converted warehouses, repurposed materials, and industrial heritage'
      ],
      umbrellaMovements: ['Industrial Heritage', 'Loft Living', 'Adaptive Reuse', 'Warehouse Conversion'],
      urbanExpression: 'Converted warehouses, exposed infrastructure, industrial districts, working waterfronts, power plants, bridges, transit hubs',
      color: '#A0522D'
    },
    'infrastructuralist': {
      name: 'The Infrastructuralist',
      coreConcept: 'Celebrates the monumental scale and systematic complexity of large-scale infrastructure and megastructures.',
      vibe: ['Raw', 'Utilitarian', 'Edgy', 'Exposed', 'Functional', 'Urban', 'Authentic', 'Systematic', 'Monumental'],
      coreQualities: [
        'Megastructural Scale: Appreciation for massive engineering projects and their visual impact',
        'Systematic Repetition: Beauty in modular systems repeated at vast scales',
        'Technological Expression: Celebration of cutting-edge engineering and construction',
        'Engineering Aesthetics: Finding beauty in structural efficiency and technical solutions',
        'Exposure of Structure: Celebration of exposed brick, ductwork, and structural beams',
        'Functional Honesty: Authentic expression of mechanical systems and infrastructure'
      ],
      umbrellaMovements: ['High-Tech Architecture', 'Structural Expressionism', 'Infrastructure Tourism', 'Megastructure Movement'],
      urbanExpression: 'Converted warehouses, exposed infrastructure, industrial districts, working waterfronts, power plants, bridges, transit hubs',
      color: '#4682B4'
    },
    'visionary': {
      name: 'The Visionary',
      coreConcept: 'Defined by relentless drive to push boundaries, experiment with form, and speculate on the future. Leverages new technologies to create sculptural, dynamic, previously unimaginable designs.',
      vibe: ['Sculptural', 'Unconventional', 'Dynamic', 'Bold', 'Innovative', 'Playful', 'Experimental'],
      coreQualities: [
        'Formal Experimentation: Rejection of traditional forms in favor of fragmentation and complexity',
        'Conceptual Depth: Design driven by strong theoretical or philosophical ideas',
        'Technological Integration: Use of cutting-edge technology like digital modeling and AI to generate complex forms',
        'Boundary Pushing: Willingness to challenge conventions and propose radical alternatives',
        'Future-Oriented: Designs that anticipate or provoke new ways of living'
      ],
      umbrellaMovements: ['Deconstructivism', 'Parametricism', 'Postmodernism', 'Blob Architecture', 'Digital Architecture', 'Critical Architecture'],
      urbanExpression: 'Iconic cultural buildings, experimental housing, tech campuses, futuristic transit hubs',
      color: '#FF6347'
    },
    'pop_culturalist': {
      name: 'The Pop Culturalist',
      coreConcept: 'Engages with aesthetics of commercialism, mass media, and spectacle, often with theatricality and irony. Uses design to communicate familiar symbols and create immediately legible experiences.',
      vibe: ['Thematic', 'Iconic', 'Commercial', 'Ironic', 'Spectacular', 'Theatrical', 'Accessible'],
      coreQualities: [
        'Use of Semiotics: Deployment of recognizable signs, logos, and icons from mass culture',
        'Spectacle and Theming: Creation of immersive, often exaggerated, narrative environments',
        'Commercial Integration: Design unapologetically linked to commerce and entertainment',
        'Irony and Kitsch: Playful, often critical, embrace of popular taste and nostalgia',
        'Immediate Legibility: Designs that communicate quickly and clearly to broad audiences'
      ],
      umbrellaMovements: ['Pop Art Architecture', 'Postmodern Classicism', 'Googie Architecture', 'Entertainment Architecture', 'Branded Environments'],
      urbanExpression: 'Times Square, Las Vegas Strip, theme parks, shopping malls, entertainment districts',
      color: '#FF69B4'
    },
    'vernacularist': {
      name: 'The Vernacularist',
      coreConcept: 'Champions localized, indigenous, and community-born design traditions developed outside elite academic structures. Foregrounds cultural continuity, climatic intelligence, and embodied knowledge.',
      vibe: ['Rooted', 'Climatic', 'Communal', 'Tactile', 'Intuitive', 'Regional', 'Sustainable'],
      coreQualities: [
        'Embodied Knowledge: Techniques and forms passed through oral tradition or apprenticeship',
        'Material Localism: Use of regional materials like mud, thatch, local stone, and indigenous woods',
        'Climatic Intelligence: Passive design strategies that respond to local environment',
        'Socio-Spatial Integration: Strong relationship between space design and community life rhythms',
        'Cultural Continuity: Respect for traditional building methods and local craft traditions'
      ],
      umbrellaMovements: ['Indigenous Architectures', 'Critical Regionalism', 'Tropical Modernism', 'Mud/Adobe/Rammed Earth Traditions', 'Sustainable Design'],
      urbanExpression: 'Historic neighborhoods, local markets, craft districts, sustainable communities, cultural quarters',
      color: '#8FBC8F'
    },
    'naturalist': {
      name: 'The Naturalist',
      coreConcept: 'Values inherent beauty of natural materials and creation of serene, grounded environments through craft and organic forms.',
      vibe: ['Rooted', 'Climatic', 'Communal', 'Tactile', 'Intuitive', 'Regional', 'Sustainable', 'Organic', 'Crafted'],
      coreQualities: [
        'Material Honesty: Celebration of wood grain, stone texture, natural fibers',
        'Craft Emphasis: Preference for handmade, artisanal quality',
        'Organic Forms: Shapes derived from or inspired by nature',
        'Human-Centered Simplicity: Warm minimalism that prioritizes comfort and connection',
        'Material Localism: Use of regional materials like mud, thatch, local stone, and indigenous woods',
        'Cultural Continuity: Respect for traditional building methods and local craft traditions'
      ],
      umbrellaMovements: ['Arts & Crafts Movement', 'Prairie School', 'Scandinavian Design', 'Japandi', 'Biophilic Design'],
      urbanExpression: 'Historic neighborhoods, local markets, craft districts, sustainable communities, cultural quarters',
      color: '#228B22'
    },
    'austerist': {
      name: 'The Austerist',
      coreConcept: 'Efficiency-driven design optimized for function, cost, and standardization. Represents the pragmatic backbone of the built environment through systematic, no-frills solutions.',
      vibe: ['Efficient', 'Systematic', 'Practical', 'Standardized', 'Functional', 'Universal', 'Cost-Conscious'],
      coreQualities: [
        'Optimized Functionality: Maximum utility with minimum resources and complexity',
        'Standardized Systems: Reliance on proven, mass-produced components and catalogued solutions',
        'Cost-Conscious Solutions: Design driven by economic efficiency and value engineering',
        'Universal Accessibility: Focus on meeting codes, standards, and basic human needs',
        'Systematic Organization: Spaces organized by logical constraints: circulation, fire codes, zoning',
        'Temporal Consistency: Unchanging environments designed for reliable, predictable function'
      ],
      umbrellaMovements: ['Corporate Architecture', 'Big-Box Retail', 'Institutional Design', 'Public Housing', 'Standard Office Buildings'],
      urbanExpression: 'Business parks, strip malls, apartment complexes, institutional buildings, suburban office parks',
      color: '#696969'
    }
  };

  return archetypeData[archetypeName.toLowerCase()] || null;
};

// Helper function to get archetype by display name
export const getArchetypeByDisplayName = (displayName) => {
  const nameMap = {
    'The Classicist': 'classicist',
    'The Romantic': 'romantic', 
    'The Stylist': 'stylist',
    'The Modernist': 'modernist',
    'The Industrialist': 'industrialist',
    'The Infrastructuralist': 'infrastructuralist',
    'The Visionary': 'visionary',
    'The Pop Culturalist': 'pop_culturalist',
    'The Vernacularist': 'vernacularist',
    'The Naturalist': 'naturalist',
    'The Austerist': 'austerist'
  };
  
  const key = nameMap[displayName];
  return key ? getDetailedArchetypeInfo(key) : null;
};