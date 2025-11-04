import type { Feature, FeatureCollection, Polygon } from "geojson";

type NolliProperties = Record<string, unknown>;

export type NolliFeatureCollection = FeatureCollection<Polygon, NolliProperties>;

export type DemoWalk = {
  id: string;
  name: string;
  featureCollection: NolliFeatureCollection;
  path: { latitude: number; longitude: number }[];
  summary?: string;
};

const createFeature = (
  id: string,
  coordinates: Polygon["coordinates"],
  props: Record<string, unknown> = {}
): Feature<Polygon, NolliProperties> => ({
  type: "Feature",
  id,
  properties: props,
  geometry: {
    type: "Polygon",
    coordinates,
  },
});

const makeCollection = (features: Feature<Polygon, NolliProperties>[]): NolliFeatureCollection => ({
  type: "FeatureCollection",
  features,
});

export const demoWalks: DemoWalk[] = [
  {
    id: "walk-soho-lanterns",
    name: "SoHo Lanterns",
    summary: "Night walk tracing lantern-lit alleys and art studios.",
    featureCollection: makeCollection([
      createFeature("lantern-court", [
        [
          [-74.0023, 40.7237],
          [-74.0018, 40.7239],
          [-74.0019, 40.7244],
          [-74.0024, 40.7242],
          [-74.0023, 40.7237],
        ],
      ]),
      createFeature("canal-spire", [
        [
          [-74.0031, 40.7229],
          [-74.0026, 40.7232],
          [-74.0027, 40.7236],
          [-74.0032, 40.7234],
          [-74.0031, 40.7229],
        ],
      ]),
      createFeature("mercer-foundry", [
        [
          [-74.0028, 40.7246],
          [-74.0023, 40.7248],
          [-74.0024, 40.7251],
          [-74.0029, 40.7249],
          [-74.0028, 40.7246],
        ],
      ]),
    ]),
    path: [
      { latitude: 40.7229, longitude: -74.0031 },
      { latitude: 40.7233, longitude: -74.0025 },
      { latitude: 40.7240, longitude: -74.0020 },
      { latitude: 40.7247, longitude: -74.0026 },
    ],
  },
  {
    id: "walk-tribeca-arches",
    name: "Tribeca Arches",
    summary: "Arched warehouse doors and hidden courtyards.",
    featureCollection: makeCollection([
      createFeature("duane-vault", [
        [
          [-74.0082, 40.7178],
          [-74.0076, 40.7180],
          [-74.0078, 40.7185],
          [-74.0084, 40.7183],
          [-74.0082, 40.7178],
        ],
      ]),
      createFeature("staple-arch", [
        [
          [-74.0074, 40.7169],
          [-74.0069, 40.7172],
          [-74.0070, 40.7176],
          [-74.0075, 40.7174],
          [-74.0074, 40.7169],
        ],
      ]),
      createFeature("greenwich-landing", [
        [
          [-74.0101, 40.7174],
          [-74.0096, 40.7177],
          [-74.0098, 40.7181],
          [-74.0103, 40.7179],
          [-74.0101, 40.7174],
        ],
      ]),
    ]),
    path: [
      { latitude: 40.7168, longitude: -74.0075 },
      { latitude: 40.7173, longitude: -74.0069 },
      { latitude: 40.7179, longitude: -74.0076 },
      { latitude: 40.7184, longitude: -74.0083 },
      { latitude: 40.7180, longitude: -74.0097 },
    ],
  },
  {
    id: "walk-financial-spires",
    name: "Financial Spires",
    summary: "Cathedral spires and brass facades in the canyon.",
    featureCollection: makeCollection([
      createFeature("trinity-spire", [
        [
          [-74.0129, 40.7082],
          [-74.0124, 40.7084],
          [-74.0126, 40.7089],
          [-74.0131, 40.7087],
          [-74.0129, 40.7082],
        ],
      ]),
      createFeature("wall-brass", [
        [
          [-74.0108, 40.7074],
          [-74.0103, 40.7076],
          [-74.0104, 40.7080],
          [-74.0109, 40.7078],
          [-74.0108, 40.7074],
        ],
      ]),
      createFeature("stone-lantern", [
        [
          [-74.0096, 40.7085],
          [-74.0091, 40.7087],
          [-74.0092, 40.7091],
          [-74.0097, 40.7089],
          [-74.0096, 40.7085],
        ],
      ]),
    ]),
    path: [
      { latitude: 40.7072, longitude: -74.0111 },
      { latitude: 40.7078, longitude: -74.0105 },
      { latitude: 40.7083, longitude: -74.0099 },
      { latitude: 40.7088, longitude: -74.0093 },
      { latitude: 40.7092, longitude: -74.0086 },
    ],
  },
];

export const MASTER_WALK_ID = "master";

export const DEFAULT_DEMO_WALK_ID = demoWalks[0]?.id ?? "walk-demo";

export const FOG_BOUNDARY = [
  { latitude: 40.7305, longitude: -74.0215 },
  { latitude: 40.7305, longitude: -73.9975 },
  { latitude: 40.7025, longitude: -73.9975 },
  { latitude: 40.7025, longitude: -74.0215 },
  { latitude: 40.7305, longitude: -74.0215 },
];
