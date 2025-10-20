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

// NEW SAFE VERSION - renamed to bypass Metro cache
export const getArchetypeColorSafe = (nameOrId) => {
  console.log('[getArchetypeColorSafe] Called with:', typeof nameOrId, nameOrId);

  // Guard against null, undefined, or non-string values
  if (nameOrId === null || nameOrId === undefined || nameOrId === '') {
    console.log('[getArchetypeColorSafe] Null/undefined/empty -> returning white');
    return '#FFFFFF';
  }

  // Safely convert to string
  let raw = '';
  try {
    if (typeof nameOrId === 'string') {
      raw = nameOrId;
    } else {
      raw = String(nameOrId);
    }

    // Now safely trim
    if (typeof raw === 'string' && raw.trim) {
      raw = raw.trim();
    }
  } catch (e) {
    console.error('[getArchetypeColorSafe] ERROR:', e);
    return '#FFFFFF';
  }

  if (!raw || raw === 'null' || raw === 'undefined') {
    return '#FFFFFF';
  }

  // Direct match
  if (ARCHETYPE_COLORS[raw]) {
    console.log('[getArchetypeColorSafe] Matched:', raw, '->', ARCHETYPE_COLORS[raw]);
    return ARCHETYPE_COLORS[raw];
  }

  // Try lowercase alias
  const lowered = raw.toLowerCase();
  const display = ID_ALIAS[lowered];
  if (display && ARCHETYPE_COLORS[display]) {
    console.log('[getArchetypeColorSafe] Alias matched:', raw, '->', display);
    return ARCHETYPE_COLORS[display];
  }

  // Try title case conversion
  try {
    const title = raw
      .replace(/^the\s+/i, '')
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    if (ARCHETYPE_COLORS[title]) {
      console.log('[getArchetypeColorSafe] Title case matched:', title);
      return ARCHETYPE_COLORS[title];
    }
  } catch (e) {
    console.error('[getArchetypeColorSafe] Title case error:', e);
  }

  console.log('[getArchetypeColorSafe] No match for:', raw, '-> white');
  return '#FFFFFF';
};

// Keep old function for backward compatibility but make it safe
export const getArchetypeColor = (nameOrId) => {
  return getArchetypeColorSafe(nameOrId);
};