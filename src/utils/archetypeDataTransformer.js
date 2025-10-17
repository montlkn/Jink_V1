import { getArchetypeColor } from "../constants/archetypeColors";

// Lightweight color helpers (no THREE dependency) to derive secondary/tertiary tints
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
};

const hslToRgb = ({ h, s, l }) => {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
};

const deriveTint = (hex, { hueShift = 0, lightness = 0, saturation = 0 } = {}) => {
  try {
    const hsl = rgbToHsl(hexToRgb(hex));
    let h = (hsl.h + hueShift) % 1; if (h < 0) h += 1;
    const s = Math.max(0, Math.min(1, hsl.s + saturation));
    const l = Math.max(0, Math.min(1, hsl.l + lightness));
    return rgbToHex(hslToRgb({ h, s, l }));
  } catch {
    return hex;
  }
};

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const DEFAULT_ARCHETYPE_DATA = [
  { name: "Romantic", percentage: 0.36 },
  { name: "Modernist", percentage: 0.32 },
  { name: "Classicist", percentage: 0.28 },
];

const getCloudPosition = (index, total) => {
  const radius = 0.55; // keep clouds well inside the orb
  const angle = (index * (Math.PI * 2)) / total - Math.PI / 2;
  return [
    Math.cos(angle) * radius * 0.18, // closer to center for stronger mixing
    Math.sin(angle) * radius * 0.18,
    (index - 1) * 0.05, // very subtle depth offset
  ];
};

const deriveSourceData = (archetypeData, allowFallback) => {
  if (Array.isArray(archetypeData) && archetypeData.length) {
    return archetypeData;
  }
  return allowFallback ? DEFAULT_ARCHETYPE_DATA : [];
};

const normalizeEntries = (entries, total) =>
  entries.map((entry) => {
    const normalized = total > 0 ? entry.raw / total : 0;
    const percentage = clamp(normalized, 0, 1);

    return {
      ...entry,
      percentage,
    };
  });

export const processArchetypeData = (archetypeData, { allowFallback = true } = {}) => {
  const baseSource = deriveSourceData(archetypeData, allowFallback)
    .map((entry) => {
      const name = entry.name || entry.archetype;
      const raw = entry.percentage ?? entry.score ?? entry.value ?? 0;
      return {
        ...entry,
        name,
        raw: Math.max(0, raw),
      };
    })
    .filter((entry) => Boolean(entry.name));

  if (!baseSource.length) {
    return [];
  }

  const totalRaw = baseSource.reduce((sum, entry) => sum + entry.raw, 0);

  let prepared = [];

  if (totalRaw > 0) {
    prepared = normalizeEntries(baseSource, totalRaw);
  } else if (allowFallback) {
    const fallbackSource = DEFAULT_ARCHETYPE_DATA.map((item) => ({
      ...item,
      name: item.name,
      raw: Math.max(0, item.percentage ?? 0),
    }));
    const fallbackTotal = fallbackSource.reduce((sum, item) => sum + item.raw, 0);
    prepared = normalizeEntries(fallbackSource, fallbackTotal);
  } else {
    return [];
  }

  const topThree = prepared
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return topThree.map((archetype, index) => {
    const { name, percentage } = archetype;
    const baseColor = archetype.color || getArchetypeColor(name);
    // Derive a triad of related colors for richer smoke blending
    const secondaryColor = deriveTint(baseColor, { hueShift: 0.03, lightness: 0.04 });
    const tertiaryColor  = deriveTint(baseColor, { hueShift: -0.03, lightness: -0.04 });
    // Proportional size mapping for dense, in-orb volumetric smoke
    // Wider base so clouds feel substantial and overlapping
    const sizeFactor = 0.8 + percentage * 1.2;
    const opacity = clamp(0.5 + percentage * 0.4, 0.5, 0.9);
    const baseScale = 0.6; // larger base for fuller smoke volume
    const width = baseScale * sizeFactor; // clamped in render layer
    const length = width * 0.95;
    const depth = width * 0.85;

    return {
      id: `cloud-${index}`,
      name,
      percentage,
      color: baseColor,
      secondaryColor,
      tertiaryColor,
      sizeFactor,
      opacity,
      dimensions: { width, length, depth },
      position: getCloudPosition(index, 3),
      rotationSpeed: 0.18 + index * 0.06,
    };
  });
};
