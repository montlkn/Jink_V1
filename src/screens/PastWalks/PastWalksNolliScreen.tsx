import { PassportBackButton } from "@/features/passport";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Feature as GeoFeature, Polygon as GeoPolygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView, { Circle, Polygon, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
    demoWalks,
    FOG_BOUNDARY,
    MASTER_WALK_ID,
    type DemoWalk,
    type NolliFeatureCollection,
} from "./nolliDemoData";

// -------------------- Types --------------------

type PastWalksStackParamList = {
  PastWalksNolli: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<PastWalksStackParamList, "PastWalksNolli">;

type Position = { latitude: number; longitude: number };

type ProjectedPolygon = {
  id: string;
  rings: Position[][];
  walkId?: string;
};

type PreparedPolygon = {
  id: string;
  walkId?: string;
  outer: Position[];
  holes: Position[][];
};

// -------------------- Constants --------------------

const DEFAULT_REGION = {
  latitude: 40.718,
  longitude: -74.006,
  latitudeDelta: 0.08,
  longitudeDelta: 0.04,
};

const WALK_COLORS = [
  { accent: "#F7685B", fill: "rgba(247, 104, 91, 0.32)" },
  { accent: "#6274FF", fill: "rgba(98, 116, 255, 0.32)" },
  { accent: "#4DD6A7", fill: "rgba(77, 214, 167, 0.32)" },
  { accent: "#F0A24C", fill: "rgba(240, 162, 76, 0.32)" },
];

// -------------------- Helpers --------------------

function convertGeoJsonRing(ring: GeoPolygon["coordinates"][number]): Position[] {
  if (!Array.isArray(ring)) {
    return [];
  }
  return ring
    .filter(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
    )
    .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

function extractProjectedPolygons(fc: NolliFeatureCollection): ProjectedPolygon[] {
  const out: ProjectedPolygon[] = [];
  fc.features.forEach((feature, index) => {
    if (!feature?.geometry || feature.geometry.type !== "Polygon") {
      return;
    }
    const baseId = String(feature.id ?? index);
    const props = feature.properties;
    const walkId =
      props && typeof props === "object" && "walkId" in props && typeof (props as any).walkId === "string"
        ? ((props as any).walkId as string)
        : undefined;
    const sourceCoords = Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : [];
    const rings = sourceCoords
      .map((ring) => convertGeoJsonRing(ring))
      .filter((ring) => ring.length >= 3);
    if (!rings.length) {
      return;
    }
    out.push({ id: baseId, rings, walkId });
  });
  return out;
}

function combineFeatureCollections(walks: DemoWalk[]): NolliFeatureCollection {
  const features: GeoFeature<GeoPolygon, Record<string, unknown>>[] = [];

  walks.forEach((walk) => {
    walk.featureCollection.features.forEach((feature) => {
      const baseProps =
        feature.properties && typeof feature.properties === "object" ? feature.properties : {};
      const props: Record<string, unknown> = { ...baseProps, walkId: walk.id };
      const clonedCoords: GeoPolygon["coordinates"] = feature.geometry.coordinates.map((ring) =>
        ring.map(([lng, lat]) => [lng, lat] as [number, number])
      );

      const cloned: GeoFeature<GeoPolygon, Record<string, unknown>> = {
        type: "Feature",
        id: feature.id,
        properties: props,
        geometry: {
          type: "Polygon",
          coordinates: clonedCoords,
        },
      };

      features.push(cloned);
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function getRingCentroid(ring: Position[]): Position | null {
  if (!ring.length) return null;
  const unique = ring[0].latitude === ring[ring.length - 1]?.latitude ? ring.slice(0, -1) : ring;
  const len = unique.length;
  if (!len) return null;
  const sum = unique.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / len,
    longitude: sum.longitude / len,
  };
}

function ensureClosedRing(ring: Position[]): Position[] {
  if (!ring.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return ring.slice();
  }
  return [...ring, { ...first }];
}

function isValidPosition(point: unknown): point is Position {
  if (!point || typeof point !== "object") {
    return false;
  }
  const candidate = point as Position;
  return (
    typeof candidate.latitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.longitude)
  );
}

function toClosedRing(ring?: Position[]): Position[] | null {
  if (!Array.isArray(ring)) return null;
  const filtered = ring.filter(isValidPosition);
  if (filtered.length < 3) return null;
  const closed = ensureClosedRing(filtered);
  return closed.map(({ latitude, longitude }) => ({ latitude, longitude }));
}

function setAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/rgba\(([^)]+),\s*[\d.]+\)/, (_match, groups) => `rgba(${groups}, ${alpha})`);
}

// -------------------- Screen --------------------

export default function PastWalksNolliScreen({ route, navigation }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [walks] = useState<DemoWalk[]>(demoWalks);
  const walkId = route.params?.walkId;

  const [selectedWalkId, setSelectedWalkId] = useState<string>(() => {
    if (walkId && walks.some((w) => w.id === walkId)) {
      return walkId;
    }
    if (walkId) {
      console.warn(
        `[PastWalksNolli] Unknown walkId "${walkId}" provided. Falling back to master view.`
      );
    }
    return MASTER_WALK_ID;
  });

  useEffect(() => {
    if (walkId && walks.some((w) => w.id === walkId)) {
      setSelectedWalkId(walkId);
    }
  }, [walkId, walks]);

  const mapProvider =
    Platform.OS === "ios" || Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

  const walkColorMap = useMemo(() => {
    const entries = new Map<string, (typeof WALK_COLORS)[number]>();
    walks.forEach((walk, index) => {
      entries.set(walk.id, WALK_COLORS[index % WALK_COLORS.length]);
    });
    return entries;
  }, [walks]);

  const getPaletteForWalk = (walkId?: string) =>
    (walkId ? walkColorMap.get(walkId) : undefined) ?? WALK_COLORS[0];

  const isMasterView = selectedWalkId === MASTER_WALK_ID;

  const activeWalks = useMemo(
    () => (isMasterView ? walks : walks.filter((walk) => walk.id === selectedWalkId)),
    [isMasterView, selectedWalkId, walks]
  );

  const combinedFeatures: NolliFeatureCollection = useMemo(
    () => combineFeatureCollections(activeWalks),
    [activeWalks]
  );

  const projected = useMemo(() => extractProjectedPolygons(combinedFeatures), [combinedFeatures]);

  const preparedPolygons = useMemo(
    (): PreparedPolygon[] =>
      projected
        .map((poly): PreparedPolygon | null => {
          const outer = toClosedRing(poly.rings[0]);
          if (!outer) return null;
          const holes = poly.rings
            .slice(1)
            .map((ring) => toClosedRing(ring))
            .filter((ring): ring is Position[] => Boolean(ring));
          return { id: poly.id, walkId: poly.walkId, outer, holes };
        })
        .filter((poly): poly is PreparedPolygon => poly !== null),
    [projected]
  );

  const activePath = useMemo(() => {
    if (isMasterView) return [];
    return activeWalks[0]?.path ?? [];
  }, [activeWalks, isMasterView]);

  const safeActivePath = useMemo(
    () =>
      activePath
        .filter((point): point is Position => isValidPosition(point))
        .map(({ latitude, longitude }) => ({ latitude, longitude })),
    [activePath]
  );

  const fogHoles = useMemo(() => preparedPolygons.map((poly) => poly.outer), [preparedPolygons]);

  const highlightCenters = useMemo(() => {
    if (isMasterView) return [];
    return preparedPolygons
      .filter((poly) => poly.walkId === selectedWalkId)
      .map((poly) => getRingCentroid(poly.outer))
      .filter((point): point is Position => Boolean(point));
  }, [isMasterView, preparedPolygons, selectedWalkId]);

  const focusCoords = useMemo(() => {
    const polygonCoords = preparedPolygons.flatMap((poly) => poly.outer);
    if (isMasterView) return polygonCoords;
    return [...polygonCoords, ...safeActivePath];
  }, [preparedPolygons, isMasterView, safeActivePath]);

  // Fit to coordinates when overlays update
  useEffect(() => {
    if (!focusCoords.length || !mapRef.current) return;
    mapRef.current.fitToCoordinates(focusCoords, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [focusCoords]);

  const tabs = useMemo(
    () => [
      { id: MASTER_WALK_ID, label: "Master Map" },
      ...walks.map((walk) => ({ id: walk.id, label: walk.name })),
    ],
    [walks]
  );

  const activeSummary = !isMasterView ? activeWalks[0]?.summary : undefined;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <PassportBackButton
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <Text style={styles.title}>Nolli Fog</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
        style={styles.tabBar}
      >
        {tabs.map((tab) => {
          const active = tab.id === selectedWalkId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setSelectedWalkId(tab.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeSummary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Lore</Text>
          <Text style={styles.summaryText}>{activeSummary}</Text>
        </View>
      ) : (
        <View style={styles.masterSummary}>
          <Text style={styles.masterSummaryText}>
            The master view reveals every visited structure while the fog keeps uncharted blocks
            in shadow.
          </Text>
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          initialRegion={DEFAULT_REGION}
          style={StyleSheet.absoluteFill}
          {...(mapProvider ? { provider: mapProvider } : {})}
        >
          {preparedPolygons.length > 0 ? (
            <Polygon
              coordinates={FOG_BOUNDARY}
              holes={fogHoles.length ? fogHoles : undefined}
              fillColor="rgba(9, 13, 24, 0.62)"
              strokeWidth={0}
            />
          ) : null}

          {preparedPolygons.map((poly) => {
            const palette = getPaletteForWalk(poly.walkId);
            const fill = isMasterView ? palette.fill : setAlpha(palette.fill, 0.42);

            // Stricter validation: ensure outer coordinates exist and are an array
            if (!poly.outer || !Array.isArray(poly.outer) || poly.outer.length < 3) {
              return null;
            }

            // Defensive check: only pass holes if it's a non-empty array of arrays of valid coordinates
            const validHoles =
              poly.holes &&
              Array.isArray(poly.holes) &&
              poly.holes.length > 0 &&
              Array.isArray(poly.holes[0]) &&
              poly.holes[0].length >= 3
                ? poly.holes
                : undefined;

            return (
              <Polygon
                key={`poly-${poly.id}`}
                coordinates={poly.outer}
                holes={validHoles}
                strokeColor={palette.accent}
                strokeWidth={isMasterView ? 1 : 2}
                fillColor={fill}
              />
            );
          })}

          {!isMasterView && safeActivePath.length > 1 ? (
            <Polyline
              coordinates={safeActivePath}
              strokeColor={getPaletteForWalk(selectedWalkId).accent}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}

          {!isMasterView
            ? highlightCenters.map((center, idx) => (
                <Circle
                  key={`halo-${idx}`}
                  center={center}
                  radius={130}
                  fillColor={setAlpha(getPaletteForWalk(selectedWalkId).fill, 0.55)}
                  strokeWidth={0}
                />
              ))
            : null}
        </MapView>

        {walks.length === 0 && (
          <View style={styles.overlay}>
            <ActivityIndicator />
            <Text style={styles.overlayTxt}>Loading walks…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// -------------------- Styles --------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07090F" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
  },
  backBtn: {
    width: 140,
    height: 70,
  },
  backTxt: { marginLeft: 2, fontSize: 16, color: "#F8F9FF" },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600", color: "#F8F9FF" },
  tabBar: {
    maxHeight: 44,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(17, 20, 30, 0.66)",
  },
  tabActive: {
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  summary: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(16, 19, 28, 0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.52)",
  },
  summaryText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.84)",
    lineHeight: 20,
  },
  masterSummary: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  masterSummaryText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
  mapWrap: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0B0E17",
  },
  overlay: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(7,7,10,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  overlayTxt: { fontSize: 14, color: "#FFFFFF" },
});
