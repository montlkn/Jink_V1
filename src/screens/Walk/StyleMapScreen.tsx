/**
 * StyleMapScreen
 *
 * Shows nearby buildings color-coded by architectural archetype on a
 * clean minimal Mapbox map. Tap a dot to see building name + style.
 */

import { getArchetypeColorSafe } from "@/constants/archetypeColors";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { fetchNearbyBuildingsFromDB } from "@/services/buildingService";
import { getCachedLocation } from "@/services/locationCacheService";
import { Ionicons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ARCHETYPE_COLORS } from "@/constants/archetypeColors";

const MAPBOX_TOKEN =
  Constants.expoConfig?.extra?.mapboxAccessToken ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "";

if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

// Radius for initial building fetch
const FETCH_RADIUS_KM = 1.5;

// Style field preference order
function resolveStyle(building: any): string {
  return (
    building.primary_aesthetic ||
    building.style ||
    building.style_prim ||
    building.style_family ||
    ""
  );
}

// Build a GeoJSON FeatureCollection from buildings
function buildingsToGeoJSON(buildings: any[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = buildings
    .filter((b) => b.latitude && b.longitude)
    .map((b) => {
      const style = resolveStyle(b);
      const color = getArchetypeColorSafe(style);
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [b.longitude, b.latitude],
        },
        properties: {
          bin: b.bin ?? "",
          name: b.name ?? b.address ?? "Unknown building",
          address: b.address ?? "",
          style: style || "Unknown",
          color,
        },
      };
    });
  return { type: "FeatureCollection", features };
}

// Legend entries derived from ARCHETYPE_COLORS
const LEGEND_ENTRIES = Object.entries(ARCHETYPE_COLORS).map(([name, color]) => ({
  name,
  color: color as string,
}));

type Callout = {
  name: string;
  style: string;
  address: string;
} | null;

export default function StyleMapScreen({ navigation }: { navigation: any }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const [loading, setLoading] = useState(true);
  const [callout, setCallout] = useState<Callout>(null);
  const [showLegend, setShowLegend] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  // Acquire location then fetch buildings
  useEffect(() => {
    (async () => {
      try {
        // Try cache first
        const cached = await getCachedLocation({ maxAge: 120000 });
        const loc = cached
          ? { latitude: cached.latitude, longitude: cached.longitude }
          : await (async () => {
              await Location.requestForegroundPermissionsAsync();
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            })();

        setLocation(loc);

        const buildings = await fetchNearbyBuildingsFromDB({
          latitude: loc.latitude,
          longitude: loc.longitude,
          radiusKm: FETCH_RADIUS_KM,
          limit: 300,
        });

        setGeojson(buildingsToGeoJSON(buildings));
      } catch (e) {
        // silent — map still shows, just empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePress = useCallback((event: any) => {
    const features = event?.features;
    if (!features?.length) {
      setCallout(null);
      return;
    }
    const props = features[0]?.properties;
    if (!props) return;
    setCallout({
      name: props.name,
      style: props.style,
      address: props.address,
    });
  }, []);

  const handleMapPress = useCallback(() => {
    setCallout(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        onPress={handleMapPress}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
      >
        {location && (
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={[location.longitude, location.latitude]}
            zoomLevel={14.5}
            animationDuration={0}
          />
        )}

        {/* User location puck */}
        <MapboxGL.UserLocation visible animated />

        {/* Building dots */}
        {geojson.features.length > 0 && (
          <MapboxGL.ShapeSource
            id="buildings"
            shape={geojson}
            onPress={handlePress}
          >
            {/* Glow halo */}
            <MapboxGL.CircleLayer
              id="building-halo"
              style={{
                circleRadius: 10,
                circleColor: ["get", "color"],
                circleOpacity: 0.18,
                circleStrokeWidth: 0,
              }}
            />
            {/* Main dot */}
            <MapboxGL.CircleLayer
              id="building-dots"
              style={{
                circleRadius: 6,
                circleColor: ["get", "color"],
                circleOpacity: 0.9,
                circleStrokeWidth: 1.5,
                circleStrokeColor: "rgba(255,255,255,0.6)",
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.colors.text} />
        </View>
      )}

      {/* Header */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.titleText}>STYLE MAP</Text>
          </View>
          <Pressable
            onPress={() => setShowLegend((v) => !v)}
            style={styles.legendButton}
            hitSlop={12}
          >
            <Ionicons
              name={showLegend ? "close" : "color-palette-outline"}
              size={20}
              color={theme.colors.text}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Callout */}
      {callout && (
        <View style={styles.callout}>
          <Text style={styles.calloutStyle}>{callout.style}</Text>
          <Text style={styles.calloutName} numberOfLines={1}>{callout.name}</Text>
          {!!callout.address && (
            <Text style={styles.calloutAddress} numberOfLines={1}>{callout.address}</Text>
          )}
        </View>
      )}

      {/* Legend panel */}
      {showLegend && (
        <View style={styles.legend}>
          {LEGEND_ENTRIES.map(({ name, color }) => (
            <View key={name} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background + "99",
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.white + "E6",
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  titleText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    color: theme.colors.text,
    opacity: 0.7,
    backgroundColor: theme.colors.white + "CC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  legendButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.white + "E6",
    borderRadius: 20,
  },

  // Callout
  callout: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  calloutStyle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: theme.colors.text,
    opacity: 0.45,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  calloutName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  calloutAddress: {
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.5,
    marginTop: 2,
  },

  // Legend
  legend: {
    position: "absolute",
    top: 100,
    right: 16,
    backgroundColor: theme.colors.white + "F0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
});
