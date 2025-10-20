// 🎨 Centralized archetype color mapping - Y2K Designer Republic Aesthetic
// Revised color palette with sleek, modern, punchy vibes - DISTINCT COLORS!
// Subtypes are darker shades of their parent archetype

export const ARCHETYPE_COLORS = {
  Classicist: '#F5F5DC',           // 🏛️ BEIGE - classical marble, timeless columns
  Romantic: '#DC143C',             // ❤️ CRIMSON RED - passionate, emotional, velvet
  Stylist: '#FFD700',              // ✨ GOLD - glamour, deco luxury, polished
  Modernist: '#0066FF',            // 🔷 ELECTRIC BLUE - rational grid, clean system
  Industrialist: '#FF8C00',        // 🔥 DARK ORANGE - rust, industrial fire, exposed metal
  Infrastructuralist: '#CC6600',   // 🌉 BURNT ORANGE - darker shade of Industrialist (subtype)
  Visionary: '#00FFFF',            // 🚀 CYAN - futuristic, experimental, digital future
  'Pop Culturalist': '#FF1493',    // 💗 DEEP PINK - neon spectacle, vegas signs
  Vernacularist: '#32CD32',        // 🏺 LIME GREEN - rooted, regional, communal
  Naturalist: '#228B22',           // 🌲 FOREST GREEN - darker shade of Vernacularist (subtype)
  Austerist: '#95A5A6',            // 📋 COOL GREY - efficient, standardized, corporate
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