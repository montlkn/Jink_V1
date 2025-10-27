import type MapView from "react-native-maps";

import type { GeoJsonFeature, GeoJsonMultiPolygon, GeoJsonPolygon, LatLng } from "../types/walks";

export type ScreenPoint = {
  x: number;
  y: number;
};

const dedupeScreenPoints = (points: ScreenPoint[]): ScreenPoint[] => {
  if (points.length < 2) return points;
  const result: ScreenPoint[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = result[result.length - 1];
    const curr = points[i];
    if (Math.abs(prev.x - curr.x) > 0.5 || Math.abs(prev.y - curr.y) > 0.5) {
      result.push(curr);
    }
  }
  return result;
};

const projectLatLng = async (
  map: MapView,
  latitude: number,
  longitude: number
): Promise<ScreenPoint | null> => {
  try {
    const point = await map.pointForCoordinate({ latitude, longitude });
    return { x: point.x, y: point.y };
  } catch {
    return null;
  }
};

export async function projectRouteToScreen(map: MapView, route: LatLng[]): Promise<ScreenPoint[]> {
  if (!route.length) return [];
  const projected = await Promise.all(
    route.map((segment) => projectLatLng(map, segment.latitude, segment.longitude))
  );
  const filtered = projected.filter((p): p is ScreenPoint => Boolean(p));
  return dedupeScreenPoints(filtered);
}

const flattenGeometryToRings = (
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon
): [number, number][][] => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates as [number, number][][];
  }

  return geometry.coordinates.flat() as [number, number][][];
};

const projectRing = async (
  map: MapView,
  ring: [number, number][]
): Promise<ScreenPoint[] | null> => {
  if (ring.length < 3) return null;

  const projected = await Promise.all(
    ring.map(([longitude, latitude]) => projectLatLng(map, latitude, longitude))
  );
  const filtered = projected.filter((point): point is ScreenPoint => Boolean(point));
  if (filtered.length < 3) {
    return null;
  }
  return dedupeScreenPoints(filtered);
};

export async function projectFeatureToScreen(
  map: MapView,
  feature: GeoJsonFeature
): Promise<ScreenPoint[][]> {
  const rings = flattenGeometryToRings(feature.geometry);
  const projectedRings = await Promise.all(rings.map((ring) => projectRing(map, ring)));
  return projectedRings.filter((ring): ring is ScreenPoint[] => Boolean(ring));
}

const toRoundedValue = (value: number): string => value.toFixed(1);

export function screenPointsToPolyline(points: ScreenPoint[]): string {
  if (points.length < 2) return "";
  return points.map((point) => `${toRoundedValue(point.x)},${toRoundedValue(point.y)}`).join(" ");
}

export function screenPointsToPath(points: ScreenPoint[]): string {
  if (points.length < 3) return "";
  const commands = points.map((point, index) => {
    const prefix = index === 0 ? "M" : "L";
    return `${prefix}${toRoundedValue(point.x)} ${toRoundedValue(point.y)}`;
  });
  return `${commands.join(" ")} Z`;
}
