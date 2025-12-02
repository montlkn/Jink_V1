/**
 * NolliMapScreen - True Nolli-style map using Mapbox
 * 
 * The Nolli map (1748) showed Rome as figure-ground:
 * - White = public/outdoor space (streets, plazas, church interiors)
 * - Black = private building mass
 * 
 * This screen recreates that aesthetic with:
 * - Mapbox custom style showing all buildings as black on white
 * - User's visited buildings highlighted in a distinct color
 * - Real building footprints from Supabase walk data
 */

import { useAuth } from "@/auth/authProvider";
import { PassportBackButton } from "@/features/passport";
// eslint-disable-next-line no-restricted-imports
import { fetchWalkDetail, fetchWalkSummaries } from "@/services/gateways/walkGateway";
import type { GeoJsonFeature, LatLng, WalkGeometry, WalkSummary } from "@/types/walks";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

// -------------------- Mapbox Setup --------------------
const MAPBOX_TOKEN = 
  Constants.expoConfig?.extra?.mapboxAccessToken || 
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "";

// Initialize once
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// -------------------- Types --------------------
type RootStackParamList = {
  NolliSkia: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "NolliSkia">;

type AuthSession = {
  user?: { id: string };
};

// -------------------- Constants --------------------
const NYC_CENTER: [number, number] = [-74.006, 40.7128];
const DEFAULT_ZOOM = 15;
const MASTER_WALK_ID = "__ALL_WALKS__";

// Colors
const VISITED_FILL = "#B8860B"; // Dark goldenrod - stands out on black/white
const VISITED_STROKE = "#8B6914";
const ROUTE_COLOR = "rgba(184, 134, 11, 0.6)";

// -------------------- Nolli Style JSON --------------------
// Custom Mapbox style that creates the figure-ground effect
const NOLLI_STYLE_JSON = {
  version: 8,
  name: "Nolli",
  sources: {
    "mapbox": {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    // Pure white background
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#FFFFFF",
      },
    },
    // Water - slightly off-white
    {
      id: "water",
      type: "fill",
      source: "mapbox",
      "source-layer": "water",
      paint: {
        "fill-color": "#F8F8F8",
      },
    },
    // Parks/green space - white (public)
    {
      id: "landuse-park",
      type: "fill",
      source: "mapbox",
      "source-layer": "landuse",
      filter: ["==", "class", "park"],
      paint: {
        "fill-color": "#FFFFFF",
      },
    },
    // ALL buildings - solid black (the Nolli effect)
    {
      id: "building",
      type: "fill",
      source: "mapbox",
      "source-layer": "building",
      paint: {
        "fill-color": "#1A1A1A",
        "fill-opacity": 0.95,
      },
    },
    // Building outlines for crispness
    {
      id: "building-outline",
      type: "line",
      source: "mapbox",
      "source-layer": "building",
      paint: {
        "line-color": "#000000",
        "line-width": 0.3,
      },
    },
    // Subtle road network (helps orientation)
    {
      id: "road-street",
      type: "line",
      source: "mapbox",
      "source-layer": "road",
      filter: ["in", "class", "street", "street_limited", "primary", "secondary", "tertiary"],
      paint: {
        "line-color": "#E8E8E8",
        "line-width": 0.5,
      },
    },
  ],
};

// -------------------- Helpers --------------------
function featureToGeoJson(feature: GeoJsonFeature): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: feature.geometry as GeoJSON.Geometry,
    properties: feature.properties || {},
  };
}

function buildingsToFeatureCollection(buildings: GeoJsonFeature[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: buildings.map(featureToGeoJson),
  };
}

function routesToFeatureCollection(routes: LatLng[][]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes.map((route, idx) => ({
      type: "Feature" as const,
      properties: { id: `route-${idx}` },
      geometry: {
        type: "LineString" as const,
        coordinates: route.map((p) => [p.longitude, p.latitude]),
      },
    })),
  };
}

function calculateBounds(buildings: GeoJsonFeature[], routes: LatLng[][]): {
  ne: [number, number];
  sw: [number, number];
} | null {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  let hasCoords = false;

  // From routes
  for (const route of routes) {
    for (const p of route) {
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      hasCoords = true;
    }
  }

  // From buildings
  for (const building of buildings) {
    const geom = building.geometry;
    const coordArrays = geom.type === "Polygon" 
      ? [geom.coordinates[0]]
      : geom.type === "MultiPolygon"
        ? geom.coordinates.map(p => p[0])
        : [];
    
    for (const coords of coordArrays) {
      for (const [lng, lat] of coords as [number, number][]) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        hasCoords = true;
      }
    }
  }

  if (!hasCoords) return null;

  // Add padding
  const lngPad = (maxLng - minLng) * 0.1;
  const latPad = (maxLat - minLat) * 0.1;

  return {
    ne: [maxLng + lngPad, maxLat + latPad],
    sw: [minLng - lngPad, minLat - latPad],
  };
}

// -------------------- Main Component --------------------
export default function NolliMapScreen({ route, navigation }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const walkIdParam = route?.params?.walkId;
  const { session } = useAuth() as { session: AuthSession | null };
  const userId = session?.user?.id;

  // State
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walkSummaries, setWalkSummaries] = useState<WalkSummary[]>([]);
  const [selectedWalkId, setSelectedWalkId] = useState<string>(MASTER_WALK_ID);
  const [walkGeometries, setWalkGeometries] = useState<Map<string, WalkGeometry>>(new Map());
  const [loadingGeometry, setLoadingGeometry] = useState(false);

  // Load walk summaries
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const summaries = await fetchWalkSummaries({
          userId,
          platform: Platform.OS,
        });
        
        if (cancelled) return;
        
        setWalkSummaries(summaries);
        
        if (walkIdParam && summaries.some((s) => s.id === walkIdParam)) {
          setSelectedWalkId(walkIdParam);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[NolliMap] Failed to load summaries:", err);
        setError("Failed to load walks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, walkIdParam]);

  // Load geometry for selected walk(s)
  useEffect(() => {
    if (walkSummaries.length === 0) return;

    let cancelled = false;

    async function loadGeometries() {
      setLoadingGeometry(true);
      
      const walksToLoad = selectedWalkId === MASTER_WALK_ID
        ? walkSummaries.filter((s) => !walkGeometries.has(s.id))
        : walkSummaries.filter((s) => s.id === selectedWalkId && !walkGeometries.has(s.id));

      if (walksToLoad.length === 0) {
        setLoadingGeometry(false);
        return;
      }

      const results = await Promise.all(
        walksToLoad.map(async (summary) => {
          try {
            const geometry = await fetchWalkDetail({
              walkId: summary.id,
              platform: Platform.OS,
            });
            return { id: summary.id, geometry };
          } catch (err) {
            console.warn(`[NolliMap] Failed to load ${summary.id}:`, err);
            return null;
          }
        })
      );

      if (cancelled) return;

      setWalkGeometries((prev) => {
        const next = new Map(prev);
        for (const result of results) {
          if (result) next.set(result.id, result.geometry);
        }
        return next;
      });
      
      setLoadingGeometry(false);
    }

    loadGeometries();
    return () => { cancelled = true; };
  }, [selectedWalkId, walkSummaries, walkGeometries]);

  // Compute active data
  const { buildings, routes, bounds } = useMemo(() => {
    const allBuildings: GeoJsonFeature[] = [];
    const allRoutes: LatLng[][] = [];

    const geometries = selectedWalkId === MASTER_WALK_ID
      ? Array.from(walkGeometries.values())
      : walkGeometries.has(selectedWalkId)
        ? [walkGeometries.get(selectedWalkId)!]
        : [];

    for (const geom of geometries) {
      if (geom.buildings) allBuildings.push(...geom.buildings);
      if (geom.route?.length > 0) allRoutes.push(geom.route);
    }

    return {
      buildings: allBuildings,
      routes: allRoutes,
      bounds: calculateBounds(allBuildings, allRoutes),
    };
  }, [selectedWalkId, walkGeometries]);

  // GeoJSON for map layers
  const buildingsGeoJson = useMemo(
    () => buildingsToFeatureCollection(buildings),
    [buildings]
  );
  
  const routesGeoJson = useMemo(
    () => routesToFeatureCollection(routes),
    [routes]
  );

  // Fit bounds when data changes
  useEffect(() => {
    if (!isReady || !bounds || !cameraRef.current) return;
    
    // Small delay to ensure map is ready
    const timer = setTimeout(() => {
      cameraRef.current?.fitBounds(bounds.ne, bounds.sw, [100, 60, 220, 60], 800);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isReady, bounds]);

  // Tab data
  const tabs = useMemo(() => [
    { id: MASTER_WALK_ID, label: "All Walks" },
    ...walkSummaries.map((s) => ({
      id: s.id,
      label: s.dominantStyle || s.borough || `Walk`,
    })),
  ], [walkSummaries]);

  const activeSummary = walkSummaries.find((s) => s.id === selectedWalkId);

  // Handle map ready
  const onMapReady = useCallback(() => {
    setIsReady(true);
  }, []);

  // -------------------- Render States --------------------
  
  if (!MAPBOX_TOKEN) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>
          Mapbox not configured.{"\n"}
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to .env
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Loading your walks...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>Sign in to view your Nolli map</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // -------------------- Main Render --------------------
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Mapbox Map */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleJSON={JSON.stringify(NOLLI_STYLE_JSON)}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        onDidFinishLoadingMap={onMapReady}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: NYC_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
          animationMode="flyTo"
          animationDuration={800}
        />

        {/* Visited buildings - highlighted */}
        {buildings.length > 0 && (
          <MapboxGL.ShapeSource id="visited-buildings" shape={buildingsGeoJson}>
            <MapboxGL.FillLayer
              id="visited-fill"
              style={{
                fillColor: VISITED_FILL,
                fillOpacity: 0.85,
              }}
            />
            <MapboxGL.LineLayer
              id="visited-outline"
              style={{
                lineColor: VISITED_STROKE,
                lineWidth: 1.5,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Walk routes */}
        {routes.length > 0 && (
          <MapboxGL.ShapeSource id="walk-routes" shape={routesGeoJson}>
            <MapboxGL.LineLayer
              id="route-line"
              style={{
                lineColor: ROUTE_COLOR,
                lineWidth: 3,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Loading overlay for geometry */}
      {loadingGeometry && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1A1A1A" />
        </View>
      )}

      {/* Header */}
      <SafeAreaView style={styles.headerContainer} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <PassportBackButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.title}>Nolli Map</Text>
          <View style={styles.headerSide} />
        </View>
      </SafeAreaView>

      {/* Bottom UI */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
        {/* Walk tabs */}
        {walkSummaries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            style={styles.tabsScroll}
          >
            {tabs.map((tab) => {
              const isActive = tab.id === selectedWalkId;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setSelectedWalkId(tab.id)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          {walkSummaries.length === 0 ? (
            <Text style={styles.infoText}>
              Complete a walk to see your buildings on the Nolli map.
            </Text>
          ) : activeSummary ? (
            <>
              <Text style={styles.infoLabel}>
                {activeSummary.dominantStyle || "Walk"}
              </Text>
              <Text style={styles.infoText}>
                {activeSummary.distanceKm?.toFixed(1)} km
                {activeSummary.borough ? ` • ${activeSummary.borough}` : ""}
                {activeSummary.era?.label ? ` • ${activeSummary.era.label}` : ""}
              </Text>
            </>
          ) : (
            <Text style={styles.infoText}>
              {buildings.length} buildings from {walkGeometries.size} walks
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Header
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Bottom
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    gap: 12,
  },
  tabsScroll: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  infoCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#999",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
