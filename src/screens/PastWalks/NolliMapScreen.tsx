/**
 * NolliMapScreen - True Nolli-style figure-ground map
 * 
 * ONLY renders:
 * - BLACK = Visited buildings (real footprints from Supabase)
 * - GREY = Adjacent buildings (real footprints)
 * - WHITE = Everything else
 * - Dashed lines = walked routes
 * - Animated smoke overlay from sprite sheet
 */

import { useAuth } from "@/auth/authProvider";
import { PassportBackButton } from "@/features/passport";
// eslint-disable-next-line no-restricted-imports
import { buildingsSupabaseClient } from "@/services/gateways/buildingsSupabaseClient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";

// -------------------- Config --------------------
const USE_DEMO_DATA = true;

const MAPBOX_TOKEN =
  Constants.expoConfig?.extra?.mapboxAccessToken ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "";

if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// -------------------- Types --------------------
type RootStackParamList = {
  NolliSkia: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "NolliSkia">;

// -------------------- Constants --------------------
const MASTER_WALK_ID = "__MASTER__";

const COLORS = {
  visited: "#000000",
  adjacent: "#888888",
  background: "#FFFFFF",
  water: "#F0F0F0",
  route: "#444444",
};

// -------------------- WKT Parser --------------------
function parseWKTMultiPolygon(wkt: string): GeoJSON.MultiPolygon | GeoJSON.Polygon | null {
  try {
    // Handle MULTIPOLYGON
    if (wkt.startsWith("MULTIPOLYGON")) {
      const coordsStr = wkt.replace("MULTIPOLYGON (", "").slice(0, -1);
      const polygons: number[][][][] = [];
      
      // Split by )),(( to get individual polygons
      const polyStrs = coordsStr.split(/\)\s*,\s*\(/);
      
      for (const polyStr of polyStrs) {
        const cleaned = polyStr.replace(/[()]/g, "").trim();
        const rings: number[][][] = [];
        
        // For simplicity, assume single ring per polygon
        const coords = cleaned.split(",").map(pair => {
          const [lng, lat] = pair.trim().split(/\s+/).map(Number);
          return [lng, lat];
        });
        
        if (coords.length > 0) {
          rings.push(coords);
          polygons.push(rings);
        }
      }
      
      if (polygons.length === 1) {
        return { type: "Polygon", coordinates: polygons[0] };
      }
      return { type: "MultiPolygon", coordinates: polygons };
    }
    
    // Handle POLYGON
    if (wkt.startsWith("POLYGON")) {
      const coordsStr = wkt.replace("POLYGON ((", "").replace("))", "");
      const coords = coordsStr.split(",").map(pair => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return [lng, lat];
      });
      return { type: "Polygon", coordinates: [coords] };
    }
    
    return null;
  } catch (e) {
    console.error("[WKT Parse Error]", e);
    return null;
  }
}

// -------------------- Demo Data --------------------
// Demo BINs - real NYC buildings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DEMO_VISITED_BINS = [
  "1001831", // Woolworth Building
  "1003188", // City Hall
  "1015266", // Flatiron Building
  "1012949", // Empire State Building area
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DEMO_ADJACENT_BINS = [
  "1001830",
  "1001832",
  "1003187",
  "1003189",
  "1015265",
  "1015267",
];

type DemoWalk = {
  id: string;
  name: string;
  date: string;
  borough: string;
  visitedBins: string[];
  adjacentBins: string[];
  route: [number, number][];
  center: [number, number];
};

const DEMO_WALKS: DemoWalk[] = [
  {
    id: "walk-fidi",
    name: "Financial District",
    date: "2024-11-28",
    borough: "Manhattan",
    visitedBins: ["1001831", "1003188"],
    adjacentBins: ["1001830", "1001832", "1003187", "1003189"],
    route: [
      [-74.0095, 40.7108],
      [-74.0088, 40.7115],
      [-74.0083, 40.7120],
      [-74.0078, 40.7125],
    ],
    center: [-74.0085, 40.7118],
  },
  {
    id: "walk-flatiron",
    name: "Flatiron District",
    date: "2024-12-01",
    borough: "Manhattan",
    visitedBins: ["1015266"],
    adjacentBins: ["1015265", "1015267"],
    route: [
      [-73.9905, 40.7405],
      [-73.9895, 40.7410],
      [-73.9885, 40.7415],
    ],
    center: [-73.9895, 40.7410],
  },
];

// -------------------- Blank Map Style --------------------
const BLANK_STYLE_JSON = {
  version: 8,
  name: "Blank",
  sources: {
    mapbox: {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8",
    },
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": COLORS.background },
    },
    {
      id: "water",
      type: "fill",
      source: "mapbox",
      "source-layer": "water",
      paint: { "fill-color": COLORS.water },
    },
    // NO buildings - we render our own
  ],
};

// -------------------- Smoke Animation --------------------
// Use sprite sheet for better performance
const SMOKE_SPRITE_SHEET = require("../../../assets/textures/nolli_smoke_spritesheet.png");

// Sprite sheet metadata (generated by create_sprite_sheet.py)
const SPRITE_CONFIG = {
  totalFrames: 250,
  frameWidth: 512,
  frameHeight: 756,
  columns: 10,
  rows: 25,
};

function AnimatedSmoke({ visible }: { visible: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_frameIndex, setFrameIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!visible) return;
    
    // Animate through frames - use every 10th frame for ~25 total frames (smoother, less memory)
    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        const nextFrame = (prev + 10) % SPRITE_CONFIG.totalFrames;
        
        // Calculate sprite position
        const col = (nextFrame % SPRITE_CONFIG.columns);
        const row = Math.floor(nextFrame / SPRITE_CONFIG.columns);
        
        // Animate to new position
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -col * SPRITE_CONFIG.frameWidth,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -row * SPRITE_CONFIG.frameHeight,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start();
        
        return nextFrame;
      });
    }, 42); // 24 fps for smooth animation (1000ms / 24 = ~42ms)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, translateX, translateY]);
  
  if (!visible) return null;
  
  return (
    <View style={[styles.smokeContainer, { opacity: 0.8 }]} pointerEvents="none">
      <View style={{
        flex: 1,
        width: '100%',
        overflow: 'hidden',
      }}>
        <Animated.Image
          source={SMOKE_SPRITE_SHEET}
          style={{
            width: SPRITE_CONFIG.frameWidth * SPRITE_CONFIG.columns,
            height: SPRITE_CONFIG.frameHeight * SPRITE_CONFIG.rows,
            transform: [
              { translateX },
              { translateY },
            ],
          }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// -------------------- Main Component --------------------
export default function NolliMapScreen({ navigation }: Props) {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session: _session } = useAuth() as { session: { user?: { id: string } } | null };

  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedWalkId, setSelectedWalkId] = useState<string>(MASTER_WALK_ID);
  const [showSmoke, setShowSmoke] = useState(true);
  
  // Building footprints from database
  const [visitedGeoJson, setVisitedGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [adjacentGeoJson, setAdjacentGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get current walk data
  const currentWalks = useMemo(() => {
    if (selectedWalkId === MASTER_WALK_ID) {
      return DEMO_WALKS;
    }
    const walk = DEMO_WALKS.find((w) => w.id === selectedWalkId);
    return walk ? [walk] : [];
  }, [selectedWalkId]);

  // Fetch building footprints from Supabase
  const fetchBuildingFootprints = useCallback(async () => {
    if (!buildingsSupabaseClient) {
      console.log("[Nolli] No buildings client");
      return;
    }

    setIsLoading(true);

    try {
      // Collect all BINs
      const visitedBins = currentWalks.flatMap((w) => w.visitedBins);
      const adjacentBins = currentWalks.flatMap((w) => w.adjacentBins);

      // Fetch visited buildings
      if (visitedBins.length > 0) {
        const { data: visitedData, error: visitedError } = await buildingsSupabaseClient
          .from("buildings_full_merge_scanning")
          .select("bin, building_name, geometry")
          .in("bin", visitedBins);

        if (visitedError) {
          console.error("[Nolli] Visited fetch error:", visitedError);
        } else if (visitedData) {
          const features: GeoJSON.Feature[] = [];
          for (const row of visitedData) {
            if (row.geometry) {
              const geom = parseWKTMultiPolygon(row.geometry);
              if (geom) {
                features.push({
                  type: "Feature",
                  properties: { bin: row.bin, name: row.building_name },
                  geometry: geom,
                });
              }
            }
          }
          setVisitedGeoJson({ type: "FeatureCollection", features });
          console.log("[Nolli] Loaded", features.length, "visited buildings");
        }
      }

      // Fetch adjacent buildings
      if (adjacentBins.length > 0) {
        const { data: adjacentData, error: adjacentError } = await buildingsSupabaseClient
          .from("buildings_full_merge_scanning")
          .select("bin, building_name, geometry")
          .in("bin", adjacentBins);

        if (adjacentError) {
          console.error("[Nolli] Adjacent fetch error:", adjacentError);
        } else if (adjacentData) {
          const features: GeoJSON.Feature[] = [];
          for (const row of adjacentData) {
            if (row.geometry) {
              const geom = parseWKTMultiPolygon(row.geometry);
              if (geom) {
                features.push({
                  type: "Feature",
                  properties: { bin: row.bin, name: row.building_name },
                  geometry: geom,
                });
              }
            }
          }
          setAdjacentGeoJson({ type: "FeatureCollection", features });
          console.log("[Nolli] Loaded", features.length, "adjacent buildings");
        }
      }
    } catch (err) {
      console.error("[Nolli] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWalks]);

  // Fetch when walk selection changes
  useEffect(() => {
    fetchBuildingFootprints();
  }, [fetchBuildingFootprints]);

  // Route GeoJSON
  const routeGeoJson = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: currentWalks.map((walk) => ({
      type: "Feature" as const,
      properties: { id: walk.id },
      geometry: {
        type: "LineString" as const,
        coordinates: walk.route,
      },
    })),
  }), [currentWalks]);

  // Camera fit
  useEffect(() => {
    if (!isMapReady || currentWalks.length === 0) return;

    const walk = currentWalks[0];
    setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: walk.center,
        zoomLevel: selectedWalkId === MASTER_WALK_ID ? 13 : 16,
        animationDuration: 600,
      });
    }, 100);
  }, [isMapReady, currentWalks, selectedWalkId]);

  const onMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  // Tab data
  const tabs = useMemo(() => [
    {
      id: MASTER_WALK_ID,
      label: "All Walks",
      count: DEMO_WALKS.reduce((s, w) => s + w.visitedBins.length, 0),
    },
    ...DEMO_WALKS.map((w) => ({
      id: w.id,
      label: w.name,
      count: w.visitedBins.length,
    })),
  ], []);

  const selectedWalk = DEMO_WALKS.find((w) => w.id === selectedWalkId);
  const visitedCount = visitedGeoJson?.features.length || 0;
  const adjacentCount = adjacentGeoJson?.features.length || 0;

  if (!MAPBOX_TOKEN) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.errorText}>Mapbox not configured</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleJSON={JSON.stringify(BLANK_STYLE_JSON)}
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
            centerCoordinate: [-74.006, 40.7128],
            zoomLevel: 14,
          }}
        />

        {/* ADJACENT buildings - Grey */}
        {adjacentGeoJson && adjacentGeoJson.features.length > 0 && (
          <MapboxGL.ShapeSource id="adjacent-source" shape={adjacentGeoJson}>
            <MapboxGL.FillLayer
              id="adjacent-fill"
              style={{
                fillColor: COLORS.adjacent,
                fillOpacity: 1,
              }}
            />
            <MapboxGL.LineLayer
              id="adjacent-outline"
              style={{
                lineColor: "#666666",
                lineWidth: 0.5,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* VISITED buildings - Black */}
        {visitedGeoJson && visitedGeoJson.features.length > 0 && (
          <MapboxGL.ShapeSource id="visited-source" shape={visitedGeoJson}>
            <MapboxGL.FillLayer
              id="visited-fill"
              style={{
                fillColor: COLORS.visited,
                fillOpacity: 1,
              }}
            />
            <MapboxGL.LineLayer
              id="visited-outline"
              style={{
                lineColor: "#000000",
                lineWidth: 1,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Walked routes - dashed */}
        {routeGeoJson.features.length > 0 && (
          <MapboxGL.ShapeSource id="route-source" shape={routeGeoJson}>
            <MapboxGL.LineLayer
              id="route-line"
              style={{
                lineColor: COLORS.route,
                lineWidth: 2.5,
                lineDasharray: [2, 2],
                lineCap: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Animated smoke overlay */}
      <AnimatedSmoke visible={showSmoke} />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingBadge}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Header */}
      <SafeAreaView style={styles.headerContainer} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <PassportBackButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.title}>Past Walks Map</Text>
          <View style={styles.headerSide}>
            <Pressable
              onPress={() => setShowSmoke(!showSmoke)}
              style={[styles.smokeToggle, !showSmoke && styles.smokeToggleOff]}
            >
              <Text style={styles.smokeToggleText}>{showSmoke ? "☁️" : "👁️"}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom UI */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
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
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  {tab.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.infoCard}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: COLORS.visited }]} />
              <Text style={styles.statValue}>{visitedCount}</Text>
              <Text style={styles.statLabel}>Visited</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: COLORS.adjacent }]} />
              <Text style={styles.statValue}>{adjacentCount}</Text>
              <Text style={styles.statLabel}>Adjacent</Text>
            </View>
          </View>

          {selectedWalk && (
            <View style={styles.walkInfo}>
              <Text style={styles.walkDate}>{selectedWalk.date}</Text>
              <Text style={styles.walkBorough}>{selectedWalk.borough}</Text>
            </View>
          )}

          {USE_DEMO_DATA && (
            <Text style={styles.demoLabel}>DEMO</Text>
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
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },

  // Smoke
  smokeContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
  smokeImage: {
    width: "100%",
    height: "100%",
    opacity: 0.7,
  },

  loadingBadge: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  loadingText: {
    color: "#FFF",
    fontSize: 12,
  },

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
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  smokeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  smokeToggleOff: {
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  smokeToggleText: {
    fontSize: 16,
  },

  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    gap: 12,
  },
  tabsScroll: {
    maxHeight: 56,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  tabActive: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabLabelActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  tabCount: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  tabCountActive: {
    color: "rgba(255,255,255,0.7)",
  },

  infoCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  stat: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  walkInfo: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  walkDate: {
    fontSize: 13,
    color: "#666",
  },
  walkBorough: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  demoLabel: {
    position: "absolute",
    top: 8,
    right: 12,
    fontSize: 10,
    color: "#B8860B",
    fontWeight: "700",
    letterSpacing: 1,
  },
});
