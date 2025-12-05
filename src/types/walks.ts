export type WalkSummary = {
  id: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  borough?: string;
  dominantStyle?: string;
  dominantArchitect?: string;
  buildingCount?: number;
  customLabel?: string;
  era?: {
    start: number;
    end: number;
    label?: string;
  };
  eraStart?: number;
  eraEnd?: number;
};

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon;
  properties?: Record<string, unknown>;
  id?: string;
};

export type WalkGeometry = {
  walkId: string;
  route: LatLng[];
  buildings: GeoJsonFeature[];
};

export type WalkHistoryDataset = {
  summaries: WalkSummary[];
  selectedWalk: WalkGeometry | null;
};
