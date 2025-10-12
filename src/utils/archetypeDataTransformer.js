import { getArchetypeColor } from '../constants/archetypeColors';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const DEFAULT_ARCHETYPE_DATA = [
  { name: 'Romantic', percentage: 0.36 },
  { name: 'Modernist', percentage: 0.32 },
  { name: 'Classicist', percentage: 0.28 },
];

const getCloudPosition = (index, total) => {
  const radius = 0.65;
  const angle = (index * (Math.PI * 2)) / total - Math.PI / 2;
  return [
    Math.cos(angle) * radius * 0.5,
    Math.sin(angle) * radius * 0.5,
    (index - 1) * 0.2,
  ];
};

const deriveSourceData = (archetypeData) => {
  if (Array.isArray(archetypeData) && archetypeData.length) {
    return archetypeData;
  }
  return DEFAULT_ARCHETYPE_DATA;
};

export const processArchetypeData = (archetypeData) => {
  const source = deriveSourceData(archetypeData)
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

  const totalRaw = source.reduce((sum, entry) => sum + entry.raw, 0);

  const prepared = (totalRaw > 0 ? source : DEFAULT_ARCHETYPE_DATA.map((item) => ({
    ...item,
    name: item.name,
    raw: Math.max(0, item.percentage ?? 0),
  })))
    .map((entry) => {
      const total = totalRaw > 0 ? totalRaw : DEFAULT_ARCHETYPE_DATA.reduce((sum, item) => sum + (item.percentage ?? 0), 0);
      const normalized = total > 0 ? entry.raw / total : entry.raw;
      const percentage = clamp(normalized, 0, 1);

      return {
        ...entry,
        percentage,
      };
    });

  const topThree = prepared
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return topThree.map((archetype, index) => {
    const { name, percentage } = archetype;
    const sizeFactor = percentage * 2 + 0.1;
    const opacity = clamp(0.35 + percentage * 0.4, 0.35, 0.85);
    const baseScale = 0.3;
    const width = baseScale * sizeFactor;
    const length = baseScale * sizeFactor * 0.8;
    const depth = baseScale * sizeFactor * 0.6;

    return {
      id: `cloud-${index}`,
      name,
      percentage,
      color: archetype.color || getArchetypeColor(name),
      sizeFactor,
      opacity,
      dimensions: { width, length, depth },
      position: getCloudPosition(index, 3),
      rotationSpeed: 0.1 + index * 0.05,
    };
  });
};
