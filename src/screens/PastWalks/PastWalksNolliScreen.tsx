import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import MapView, {
  MapViewProps,
  Polygon,
  PROVIDER_GOOGLE, // <-- 1. IMPORTED PROVIDER_GOOGLE
} from "react-native-maps";

// -------------------- Types --------------------

type PastWalksStackParamList = {
  PastWalksNolli: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<PastWalksStackParamList, "PastWalksNolli">;

type Position = { latitude: number; longitude: number };

type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: number[][][]; // rings -> [lng, lat]
  properties?: Record<string, unknown>;
  id?: string | number;
};

type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][]; // polys -> rings -> [lng, lat]
  properties?: Record<string, unknown>;
  id?: string | number;
};

type GeoJSONFeature = {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
};

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

type ProjectedPolygon = {
  id: string;
  rings: Position[][];
};

// -------------------- Constants --------------------

const DEFAULT_REGION = {
  latitude: 40.712776,
  longitude: -74.005974,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// -------------------- Data --------------------

const _cache = new Map<string, GeoJSONFeatureCollection>();

async function loadNolliGeoJSON(walkId?: string): Promise<GeoJSONFeatureCollection> {
  if (!walkId) throw new Error("walkId required");

  const cached = _cache.get(walkId);
  if (cached) return cached;

  // Replace with your real endpoint.
  const res = await fetch(
    `https://api.yourdomain.com/walks/${encodeURIComponent(walkId)}/nolli`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as unknown;
  assertFeatureCollection(data);
  _cache.set(walkId, data);
  return data;
}

function assertFeatureCollection(x: any): asserts x is GeoJSONFeatureCollection {
  if (!x || x.type !== "FeatureCollection" || !Array.isArray(x.features)) {
    throw new Error("Invalid GeoJSON: not a FeatureCollection");
  }
  for (const f of x.features) {
    if (!f?.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) {
      throw new Error("Invalid GeoJSON: only Polygon or MultiPolygon supported");
    }
  }
}

// -------------------- Helpers --------------------

function convertGeoJsonRing(ring: number[][]): Position[] {
  return ring
    .filter(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
    )
    .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

function extractProjectedPolygons(fc: GeoJSONFeatureCollection): ProjectedPolygon[] {
  const out: ProjectedPolygon[] = [];
  for (const feature of fc.features) {
    const geom = feature.geometry;
    const baseId = String(feature.id ?? out.length);
    if (geom.type === "Polygon") {
      const rings = geom.coordinates.map((ring) => convertGeoJsonRing(ring));
      out.push({ id: baseId, rings });
    } else {
      geom.coordinates.forEach((polyCoords, idx) => {
        const rings = polyCoords.map((ring) => convertGeoJsonRing(ring));
        out.push({ id: `${baseId}-${idx}`, rings });
      });
    }
  }
  return out;
}

// -------------------- Screen --------------------

export default function PastWalksNolliScreen({ route, navigation }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fc, setFc] = useState<GeoJSONFeatureCollection | null>(null);

  const walkId = route.params?.walkId;

  // Diagnostics: confirm native view is linked and which package version is loaded.
  useEffect(() => {
    // <-- 3. UPDATED DIAGNOSTIC LOG -->
    const mgr =
      Platform.OS === "ios"
        ? UIManager.getViewManagerConfig?.("AIRGoogleMap") // Check for Google Maps manager
        : UIManager.getViewManagerConfig?.("AIRGoogleMap");
    console.log("Google Map manager:", Platform.OS, mgr);
    // <-- END UPDATE -->
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rnmPkg = require("react-native-maps/package.json");
      console.log("react-native-maps:", rnmPkg?.version, rnmPkg?.main);
    } catch (e) {
      console.log("react-native-maps package read failed:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await loadNolliGeoJSON(walkId);
        if (!mounted) return;
        setFc(data);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load map data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [walkId]);

  const projected = useMemo(() => (fc ? extractProjectedPolygons(fc) : []), [fc]);

  // Fit to all coordinates only. Avoid animate* calls.
  useEffect(() => {
    if (!projected.length || !mapRef.current) return;
    const coords = projected.flatMap((p) => p.rings).flat();
    if (!coords.length) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [projected]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={20} />
        <Text style={styles.backTxt}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Nolli Overlay</Text>
      <View style={{ width: 56 }} />
    </View>
  );

  const mapProps: MapViewProps = {
    provider: PROVIDER_GOOGLE, // <-- 2. ADDED THIS PROP
    initialRegion: DEFAULT_REGION,
    style: StyleSheet.absoluteFill,
  };

  return (
    <SafeAreaView style={styles.root}>
      {renderHeader()}

      <View style={styles.mapWrap}>
        <MapView ref={mapRef} {...mapProps}>
          {projected.map((poly) =>
            poly.rings.map((ring, idx) => (
              <Polygon
                key={`${poly.id}-${idx}`}
                coordinates={ring}
                strokeWidth={1}
                strokeColor="rgba(0,0,0,0.6)"
                fillColor="rgba(0,0,0,0.15)"
              />
            ))
          )}
        </MapView>

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator />
            <Text style={styles.overlayTxt}>Loading</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// -------------------- Styles --------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingRight: 8,
    width: 56,
  },
  backTxt: { marginLeft: 2, fontSize: 16 },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600" },
  mapWrap: {
    flex: 1,
    backgroundColor: "#fff", // solid background to silence shadow warning
  },
  overlay: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  overlayTxt: { fontSize: 14 },
  errorBanner: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  errorText: { color: "#991B1B", fontSize: 13, textAlign: "center" },
});