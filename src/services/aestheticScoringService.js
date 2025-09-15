/**
 * Aesthetic Scoring Service
 * Implements the 9-category scoring algorithm with subtype resolution
 */

// Scoring constants from the framework
export const SCORING = {
  primary: 5,
  secondary: 2,
  tertiary: 0.5,
  contradiction: -1
};

export const ARCHETYPES = [
  'classicist', 'romantic', 'stylist', 'modernist',
  'industrialist', 'visionary', 'pop_culturalist', 
  'vernacularist', 'austerist'
];

export const SUBTYPES = {
  infrastructuralist: 'industrialist',
  naturalist: 'vernacularist'
};

/**
 * Calculate aesthetic profile from quiz responses
 * This is a client-side implementation for validation/preview
 * The main calculation happens server-side via Supabase function
 */
export const calculateClientSideProfile = (responses, questions) => {
  const scores = {};
  ARCHETYPES.forEach(archetype => scores[archetype] = 0);
  
  // Add subtype tracking
  scores.infrastructuralist = 0;
  scores.naturalist = 0;

  let totalResponseTime = 0;
  let responseCount = 0;

  // Process each response
  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const option = question.question_options?.find(opt => opt.id === response.optionId);
    if (!option || !option.aesthetic_scores) return;

    // Add scores for this response
    Object.entries(option.aesthetic_scores).forEach(([archetype, points]) => {
      if (scores.hasOwnProperty(archetype)) {
        scores[archetype] += points;
      }
    });

    // Track response time for confidence scoring
    if (response.responseTime) {
      totalResponseTime += response.responseTime;
      responseCount++;
    }
  });

  // Enhanced confidence scoring based on response patterns
  const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 5000;
  let confidenceScore;
  
  if (avgResponseTime < 3000) {
    // Fast responses show high confidence
    confidenceScore = 0.9 + (3000 - avgResponseTime) / 10000;
  } else if (avgResponseTime < 8000) {
    // Medium responses show medium confidence  
    confidenceScore = 0.6 + (8000 - avgResponseTime) / 16667;
  } else {
    // Slow responses show lower confidence
    confidenceScore = Math.max(0.3, 0.6 - (avgResponseTime - 8000) / 20000);
  }
  
  // Cap at reasonable bounds
  confidenceScore = Math.max(0.2, Math.min(1.0, confidenceScore));
  
  // Additional confidence boost for consistent response times
  const responseVariance = responses.reduce((variance, r, i) => {
    if (!r.responseTime) return variance;
    const diff = r.responseTime - avgResponseTime;
    return variance + (diff * diff);
  }, 0) / responseCount;
  
  const consistencyBonus = responseVariance < 2000000 ? 0.1 : 0; // Low variance = more consistent
  confidenceScore = Math.min(1.0, confidenceScore + consistencyBonus);

  // Find primary and secondary archetypes
  const archetypeScores = ARCHETYPES.map(archetype => ({
    archetype,
    score: scores[archetype]
  })).sort((a, b) => b.score - a.score);

  const primaryArchetype = archetypeScores[0];
  const secondaryArchetype = archetypeScores[1];

  // Calculate category separation score
  const separationScore = Math.min(1.0, 
    (primaryArchetype.score - (secondaryArchetype?.score || 0)) / 50.0
  );

  // Apply subtype resolution logic
  let finalPrimaryArchetype = primaryArchetype.archetype;
  
  if (primaryArchetype.archetype === 'industrialist' && 
      primaryArchetype.score > 40 && 
      scores.infrastructuralist / primaryArchetype.score > 0.6) {
    finalPrimaryArchetype = 'infrastructuralist';
  }
  
  if (primaryArchetype.archetype === 'vernacularist' && 
      primaryArchetype.score > 40 && 
      scores.naturalist / primaryArchetype.score > 0.6) {
    finalPrimaryArchetype = 'naturalist';
  }

  return {
    scores,
    primaryArchetype: finalPrimaryArchetype,
    secondaryArchetype: secondaryArchetype?.archetype,
    confidenceScore,
    separationScore,
    isComplete: responses.length >= questions.length
  };
};

/**
 * Get archetype display information
 */
export const getArchetypeInfo = (archetype) => {
  const archetypeData = {
    classicist: {
      name: 'The Classicist',
      description: 'Embodies reverence for enduring principles of order, harmony, and grandeur.',
      coreConcept: 'Embodies reverence for enduring principles of order, harmony, and grandeur.',
      vibe: ['Formal', 'Symmetrical', 'Grand', 'Rational', 'Ornate', 'Enduring'],
      coreQualities: [
        'Reverence for historical precedent and established forms',
        'Belief in universal principles of beauty and proportion',
        'Emphasis on symmetry, hierarchy, and formal order',
        'Preference for refined materials and skilled craftsmanship'
      ],
      urbanExpression: 'Classical architecture in cities emphasizes civic grandeur through monuments, columns, and formal spatial arrangements that convey authority and permanence.',
      umbrellaMovements: ['Neoclassicism', 'Beaux-Arts', 'Classical Revival'],
      color: '#8B4513'
    },
    romantic: {
      name: 'The Romantic',
      description: 'Prioritizes emotion, narrative, and individualism over rational order.',
      coreConcept: 'Prioritizes emotion, narrative, and individualism over rational order.',
      vibe: ['Expressive', 'Story-Driven', 'Whimsical', 'Layered', 'Evocative', 'Atmospheric'],
      coreQualities: [
        'Emphasis on emotional expression and personal narrative',
        'Preference for organic, irregular, and picturesque forms',
        'Value placed on individual creativity over systematic rules',
        'Appreciation for historical eclecticism and cultural storytelling'
      ],
      urbanExpression: 'Romantic urban environments feature eclectic neighborhoods with varied building styles, intimate public spaces, and architecture that tells stories of different eras and cultures.',
      umbrellaMovements: ['Gothic Revival', 'Art Nouveau', 'Victorian Architecture'],
      color: '#8B008B'
    },
    stylist: {
      name: 'The Stylist',
      description: 'Defined by appreciation for glamour, surface, and visual rhythm.',
      vibe: ['Glamorous', 'Geometric', 'Luxurious', 'Polished', 'Confident', 'Sophisticated'],
      color: '#FFD700'
    },
    modernist: {
      name: 'The Modernist',
      description: 'Driven by belief in universal principles, functionalism, and rejection of unnecessary ornament.',
      vibe: ['Clean', 'Intentional', 'Minimal', 'Universal', 'Functional', 'Sleek', 'Systematic'],
      color: '#2F4F4F'
    },
    industrialist: {
      name: 'The Industrialist',
      description: 'Finds beauty in the raw, utilitarian, and exposed. Values honesty and durability.',
      vibe: ['Raw', 'Utilitarian', 'Edgy', 'Exposed', 'Functional', 'Urban', 'Authentic'],
      color: '#A0522D'
    },
    visionary: {
      name: 'The Visionary',
      description: 'Defined by relentless drive to push boundaries and experiment with form.',
      vibe: ['Sculptural', 'Unconventional', 'Dynamic', 'Bold', 'Innovative', 'Playful', 'Experimental'],
      color: '#FF6347'
    },
    pop_culturalist: {
      name: 'The Pop Culturalist',
      description: 'Engages with aesthetics of commercialism, mass media, and spectacle.',
      vibe: ['Thematic', 'Iconic', 'Commercial', 'Ironic', 'Spectacular', 'Theatrical', 'Accessible'],
      color: '#FF69B4'
    },
    vernacularist: {
      name: 'The Vernacularist',
      description: 'Champions localized, indigenous, and community-born design traditions.',
      vibe: ['Rooted', 'Climatic', 'Communal', 'Tactile', 'Intuitive', 'Regional', 'Sustainable'],
      color: '#228B22'
    },
    austerist: {
      name: 'The Austerist',
      description: 'Efficiency-driven design optimized for function, cost, and standardization.',
      vibe: ['Efficient', 'Systematic', 'Practical', 'Standardized', 'Functional', 'Universal', 'Cost-Conscious'],
      color: '#696969'
    },
    infrastructuralist: {
      name: 'The Infrastructuralist',
      description: 'Celebrates the monumental scale and systematic complexity of large-scale infrastructure.',
      vibe: ['Megascale', 'Systematic', 'Technological', 'Engineering', 'Monumental'],
      color: '#4682B4'
    },
    naturalist: {
      name: 'The Naturalist',
      description: 'Values inherent beauty of natural materials and creation of serene, grounded environments.',
      vibe: ['Material Honest', 'Craft', 'Organic', 'Serene', 'Grounded'],
      color: '#8FBC8F'
    }
  };

  return archetypeData[archetype] || null;
};

/**
 * Prepare scores for donut chart visualization
 */
export const prepareChartData = (scores, primaryArchetype, secondaryArchetype) => {
  const chartData = [];
  const totalScore = Object.values(scores).reduce((sum, score) => sum + Math.max(0, score), 0);
  
  if (totalScore === 0) return [];

  // Add all archetypes with positive scores
  ARCHETYPES.forEach(archetype => {
    const score = scores[archetype];
    if (score > 0) {
      const info = getArchetypeInfo(archetype);
      chartData.push({
        archetype,
        name: info?.name || archetype,
        score,
        value: score,
        percentage: Math.round((score / totalScore) * 100),
        color: info?.color || '#999999',
        isPrimary: archetype === primaryArchetype,
        isSecondary: archetype === secondaryArchetype
      });
    }
  });

  // Sort by score descending
  return chartData.sort((a, b) => b.score - a.score);
};

/**
 * Generate user-friendly profile summary
 */
export const generateProfileSummary = (profile) => {
  const primaryInfo = getArchetypeInfo(profile.primaryArchetype);
  const secondaryInfo = getArchetypeInfo(profile.secondaryArchetype);
  
  if (!primaryInfo) return null;

  return {
    title: primaryInfo.name,
    description: primaryInfo.description,
    primaryVibe: primaryInfo.vibe,
    secondaryArchetype: secondaryInfo ? {
      name: secondaryInfo.name,
      vibe: secondaryInfo.vibe.slice(0, 3) // Show top 3 traits
    } : null,
    confidenceLevel: profile.confidenceScore > 0.8 ? 'Very High' :
                    profile.confidenceScore > 0.65 ? 'High' : 
                    profile.confidenceScore > 0.45 ? 'Medium' : 
                    profile.confidenceScore > 0.25 ? 'Low' : 'Very Low',
    distinctiveness: profile.separationScore > 0.6 ? 'Very Distinct' :
                    profile.separationScore > 0.3 ? 'Moderately Distinct' : 'Mixed Preferences'
  };
};