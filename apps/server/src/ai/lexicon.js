/**
 * Archetype style lexicon used to ground LLM outputs
 * Mirrors mobile-side descriptors to keep tone consistent.
 */

export const ARCHETYPE_LEXICON = {
  classicist: {
    name: 'The Classicist',
    vibe: ['Timeless', 'Proportioned', 'Ornamented', 'Ordered', 'Elegant', 'Refined'],
  },
  romantic: {
    name: 'The Romantic',
    vibe: ['Expressive', 'Story-Driven', 'Whimsical', 'Layered', 'Evocative', 'Atmospheric'],
  },
  stylist: {
    name: 'The Stylist',
    vibe: ['Glamorous', 'Geometric', 'Luxurious', 'Polished', 'Confident', 'Sophisticated'],
  },
  modernist: {
    name: 'The Modernist',
    vibe: ['Clean', 'Intentional', 'Minimal', 'Universal', 'Functional', 'Sleek', 'Systematic'],
  },
  industrialist: {
    name: 'The Industrialist',
    vibe: ['Raw', 'Utilitarian', 'Exposed', 'Functional', 'Urban', 'Authentic'],
  },
  visionary: {
    name: 'The Visionary',
    vibe: ['Sculptural', 'Unconventional', 'Dynamic', 'Bold', 'Innovative', 'Playful', 'Experimental'],
  },
  pop_culturalist: {
    name: 'The Pop Culturalist',
    vibe: ['Thematic', 'Iconic', 'Commercial', 'Ironic', 'Spectacular', 'Theatrical', 'Accessible'],
  },
  vernacularist: {
    name: 'The Vernacularist',
    vibe: ['Rooted', 'Climatic', 'Communal', 'Tactile', 'Intuitive', 'Regional', 'Sustainable'],
  },
  austerist: {
    name: 'The Austerist',
    vibe: ['Efficient', 'Systematic', 'Practical', 'Standardized', 'Functional', 'Cost-Conscious'],
  },
  infrastructuralist: {
    name: 'The Infrastructuralist',
    vibe: ['Megascale', 'Systematic', 'Technological', 'Engineering', 'Monumental'],
  },
  naturalist: {
    name: 'The Naturalist',
    vibe: ['Material Honest', 'Craft', 'Organic', 'Serene', 'Grounded'],
  },
};

export function getLexiconFor(archetype) {
  if (!archetype) return null;
  return ARCHETYPE_LEXICON[archetype] || null;
}

