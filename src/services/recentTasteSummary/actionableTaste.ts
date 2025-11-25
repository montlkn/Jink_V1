export type RecentScan = {
  style?: string;
  architect?: string;
  year?: number;
};

export type RecentWalk = {
  dominantStyle?: string;
  dominantArchitect?: string;
  era?: { start: number; end: number };
};

export type TasteAction = {
  headline: string;
  filters: {
    style_in?: string[];
    architect_in?: string[];
    year_gte?: number;
    year_lte?: number;
  };
  central: { kind: "style" | "architect" | "era"; label: string };
};

function clampHeadline(text: string, max = 42): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function shortHeadline(
  kind: "style" | "architect" | "era",
  label: string,
  confidence = 0.8
): string {
  const trimmed = label.trim();
  const soft = confidence < 0.6;
  switch (kind) {
    case "style":
      return clampHeadline(soft ? `Try ${trimmed} nearby` : `More ${trimmed} nearby`);
    case "architect":
      return clampHeadline(
        soft ? `Try works by ${trimmed}` : `More by ${trimmed}`
      );
    case "era":
    default:
      return clampHeadline(soft ? `Try ${trimmed} nearby` : `More from ${trimmed}`);
  }
}

export const DEFAULT_TASTE_ACTION: TasteAction = {
  headline: shortHeadline("style", "something new", 0.5),
  filters: {},
  central: { kind: "style", label: "something new" },
};

function pickTop(map: Map<string, number>): string | null {
  let winner: string | null = null;
  let weight = Number.NEGATIVE_INFINITY;
  for (const [label, count] of map.entries()) {
    if (count > weight) {
      winner = label;
      weight = count;
    }
  }
  return winner;
}

type EraBounds = { label: string; start: number; end: number };

function inferEra(years: number[]): EraBounds | null {
  if (!Array.isArray(years) || !years.length) {
    return null;
  }
  const sorted = Array.from(years).sort((a, b) => a - b);
  const sample = (quantile: number) => {
    const idx = Math.floor((sorted.length - 1) * quantile);
    return sorted[idx];
  };

  const p10 = sample(0.1);
  const p90 = sample(0.9);
  const span = p90 - p10;

  if (span <= 0) {
    const center = sorted[Math.floor(sorted.length / 2)];
    return {
      label: `${center}–${center + 1}`,
      start: center - 5,
      end: center + 5,
    };
  }

  const KNOWN_ERAS: EraBounds[] = [
    { label: "the 1880s–1910s", start: 1880, end: 1919 },
    { label: "the 1920s–40s", start: 1920, end: 1949 },
    { label: "the mid-century", start: 1950, end: 1969 },
    { label: "the 1970s–80s", start: 1970, end: 1989 },
  ];

  for (const era of KNOWN_ERAS) {
    const overlap = Math.min(p90, era.end) - Math.max(p10, era.start);
    if (overlap >= 10) {
      return era;
    }
  }

  return {
    label: `${p10}–${p90}`,
    start: p10,
    end: p90,
  };
}

function eraBoundsForStyle(style: string): {
  year_gte?: number;
  year_lte?: number;
} {
  const needle = style.toLowerCase();
  if (needle.includes("deco")) {
    return { year_gte: 1920, year_lte: 1949 };
  }
  if (needle.includes("beaux")) {
    return { year_gte: 1880, year_lte: 1920 };
  }
  if (needle.includes("brut")) {
    return { year_gte: 1955, year_lte: 1985 };
  }
  if (needle.includes("gothic")) {
    return { year_gte: 1830, year_lte: 1910 };
  }
  if (needle.includes("neo")) {
    return { year_gte: 1760, year_lte: 1920 };
  }
  if (needle.includes("modern")) {
    return { year_gte: 1925, year_lte: 1975 };
  }
  return {};
}

export async function getActionableTaste(input: {
  last10Scans: RecentScan[];
  last3Walks: RecentWalk[];
}): Promise<TasteAction | null> {
  const styleCount = new Map<string, number>();
  const archCount = new Map<string, number>();
  const years: number[] = [];

  const accumulateStyle = (label: string | undefined, weight = 1) => {
    if (!label) {
      return;
    }
    const current = styleCount.get(label) ?? 0;
    styleCount.set(label, current + weight);
  };

  const accumulateArchitect = (label: string | undefined, weight = 1) => {
    if (!label) {
      return;
    }
    const current = archCount.get(label) ?? 0;
    archCount.set(label, current + weight);
  };

  const addYear = (year: number | undefined) => {
    if (typeof year === "number" && Number.isFinite(year)) {
      years.push(Math.round(year));
    }
  };

  for (const scan of input.last10Scans ?? []) {
    accumulateStyle(scan?.style);
    accumulateArchitect(scan?.architect);
    addYear(scan?.year);
  }

  for (const walk of input.last3Walks ?? []) {
    accumulateStyle(walk?.dominantStyle, 0.5);
    accumulateArchitect(walk?.dominantArchitect, 0.5);
    const era = walk?.era;
    if (era) {
      const midpoint = Math.floor(((era.start ?? 0) + (era.end ?? 0)) / 2);
      addYear(midpoint);
      addYear(midpoint);
    }
  }

  const topStyle = pickTop(styleCount);
  const topArchitect = pickTop(archCount);
  const eraResult = inferEra(years);

  if (topStyle) {
    const headline = shortHeadline("style", topStyle, 0.8);
    return {
      headline,
      filters: {
        style_in: [topStyle],
        ...eraBoundsForStyle(topStyle),
      },
      central: { kind: "style", label: topStyle },
    };
  }

  if (topArchitect) {
    const headline = shortHeadline("architect", topArchitect, 0.75);
    return {
      headline,
      filters: { architect_in: [topArchitect] },
      central: { kind: "architect", label: topArchitect },
    };
  }

  if (eraResult) {
    const headline = shortHeadline("era", eraResult.label, 0.65);
    return {
      headline,
      filters: {
        year_gte: eraResult.start,
        year_lte: eraResult.end,
      },
      central: { kind: "era", label: eraResult.label },
    };
  }

  return DEFAULT_TASTE_ACTION;
}
