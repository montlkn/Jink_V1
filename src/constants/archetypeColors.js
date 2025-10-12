// Centralized archetype color mapping derived from services

export const ARCHETYPE_COLORS = {
  Classicist: '#8B4513',
  Romantic: '#8B008B',
  Stylist: '#FFD700',
  Modernist: '#2F4F4F',
  Industrialist: '#A0522D',
  Visionary: '#FF6347',
  'Pop Culturalist': '#FF69B4',
  Vernacularist: '#228B22',
  Austerist: '#696969',
  Infrastructuralist: '#4682B4',
  Naturalist: '#8FBC8F',
};

// Support common id keys used in services/state
const ID_ALIAS = {
  classicist: 'Classicist',
  romantic: 'Romantic',
  stylist: 'Stylist',
  modernist: 'Modernist',
  industrialist: 'Industrialist',
  visionary: 'Visionary',
  pop_culturalist: 'Pop Culturalist',
  vernacularist: 'Vernacularist',
  austerist: 'Austerist',
  infrastructuralist: 'Infrastructuralist',
  naturalist: 'Naturalist',
};

export const getArchetypeColor = (nameOrId) => {
  if (!nameOrId) return '#FFFFFF';
  const raw = String(nameOrId).trim();
  // Direct name match first
  if (ARCHETYPE_COLORS[raw]) return ARCHETYPE_COLORS[raw];
  // Map common ids -> display names
  const lowered = raw.toLowerCase();
  const display = ID_ALIAS[lowered];
  if (display && ARCHETYPE_COLORS[display]) return ARCHETYPE_COLORS[display];

  // Try convert snake_case to Title Case as a last resort
  const title = raw
    .replace(/^the\s+/i, '')
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return ARCHETYPE_COLORS[title] || '#FFFFFF';
};

