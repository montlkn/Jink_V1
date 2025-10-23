import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { MapViewProps, Polygon, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { useAuth } from "../../auth/authProvider";
import { PAST_WALKS_NOLLI_MAP_STYLE } from "../../constants/mapStyles";
import {
  hydrateWalkHistoryDataset
} from "../../services/walkHistoryService";
import type { GeoJsonFeature, LatLng, WalkGeometry, WalkSummary } from "../../types/walks";
import {
  projectFeatureToScreen,
  projectRouteToScreen,
  screenPointsToPath,
  screenPointsToPolyline,
} from "../../utils/mapProjection";

type PastWalksStackParamList = {
  PastWalksNolli: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<PastWalksStackParamList, "PastWalksNolli">;

const DEFAULT_REGION = {
  latitude: 40.712776,
  longitude: -74.005974,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const FEATHER_STEPS = [
  { strokeWidth: 30, opacity: 0.18 },
  { strokeWidth: 20, opacity: 0.28 },
  { strokeWidth: 10, opacity: 0.5 },
];

const FOG_COLOR = "rgba(0, 0, 0, 0.72)";
const MASK_ID = "pastWalksMask";
const MIN_LAT_LNG_DELTA = 0.005;
const ROUTE_PADDING_FACTOR = 0.2;

type ProjectedPolygon = {
  id: string;
  rings: string[];
};

type MapPolygon = {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  holes?: { latitude: number; longitude: number }[][];
};

const createRegionForRoute = (coordinates: LatLng[], paddingFactor = ROUTE_PADDING_FACTOR): Region | null => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  coordinates.forEach((point) => {
    if (!point) return;
    const { latitude, longitude } = point;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (latitude < minLat) minLat = latitude;
    if (latitude > maxLat) maxLat = latitude;
    if (longitude < minLng) minLng = longitude;
    if (longitude > maxLng) maxLng = longitude;
  });

  const latitudeDelta = Math.max((maxLat - minLat) * (1 + paddingFactor), MIN_LAT_LNG_DELTA);
  const longitudeDelta = Math.max((maxLng - minLng) * (1 + paddingFactor), MIN_LAT_LNG_DELTA);

  return {
    latitude: (maxLat + minLat) / 2,
    longitude: (maxLng + minLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const formatSummaryTitle = (summary: WalkSummary): string => {
  const startedAt = summary.startedAt
    ? new Date(summary.startedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const parts: string[] = [];
  if (startedAt) parts.push(startedAt);
  if (summary.borough) parts.push(summary.borough);
  if (Number.isFinite(summary.distanceKm)) parts.push(`${summary.distanceKm.toFixed(1)} km`);
  return parts.join(" · ") || "Past Walk";
};

const PastWalksNolliScreen: React.FC<Props> = ({ navigation, route }) => {
  const { walkId } = route.params ?? {};
  const mapRef = useRef<MapView>(null);
  const { session } = useAuth() as { session?: { user?: { id?: string } } };
  // Require Google Maps on both platforms for custom styling
  const mapProvider = useMemo(() => PROVIDER_GOOGLE, []);
  const [isMapReady, setIsMapReady] = useState(false);
  const [summaries, setSummaries] = useState<WalkSummary[]>([]);
  const [selectedWalk, setSelectedWalk] = useState<WalkGeometry | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isSelectingWalk, setIsSelectingWalk] = useState(false);
  const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });
  const [projectedPolygons, setProjectedPolygons] = useState<ProjectedPolygon[]>([]);
  const [routePolyline, setRoutePolyline] = useState("");
  const userId = session?.user?.id ?? null;
  const projectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedWalkRef = useRef<WalkGeometry | null>(null);

  const updateSelectedWalk = useCallback((geometry: WalkGeometry | null) => {
    selectedWalkRef.current = geometry;
    setSelectedWalk(geometry);
  }, []);

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleMapReady: MapViewProps["onMapReady"] = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleFitToWalk = useCallback(() => {}, []);

  const projectGeometry = useCallback(async (geometry: WalkGeometry | null) => {
    const map = mapRef.current;
    if (!map || !geometry || mapLayout.width <= 0 || mapLayout.height <= 0) return;

    try {
      const routePoints = await projectRouteToScreen(map, geometry.route);
      const routePolylineString = screenPointsToPolyline(routePoints);

      const polygonResults: ProjectedPolygon[] = [];
      for (let i = 0; i < geometry.buildings.length; i += 1) {
        const feature = geometry.buildings[i] as GeoJsonFeature;
        const rings = await projectFeatureToScreen(map, feature);
        const ringPaths = rings.map((ring) => screenPointsToPath(ring)).filter(Boolean);

        if (ringPaths.length > 0) {
          const featureId = feature.id ?? `feature-${i}`;
          polygonResults.push({ id: featureId, rings: ringPaths });
        }
      }

      if (selectedWalkRef.current?.walkId !== geometry.walkId) return;

      setRoutePolyline(routePolylineString);
      setProjectedPolygons(polygonResults);
    } catch (error) {
      console.error("[PastWalksNolli] Projection failed", error);
    }
  }, [mapLayout.height, mapLayout.width]);

  const scheduleProjection = useCallback((geometry: WalkGeometry | null, delay = 150) => {
    if (projectionTimeoutRef.current) {
      clearTimeout(projectionTimeoutRef.current);
      projectionTimeoutRef.current = null;
    }
    if (!geometry || !mapRef.current) {
      setRoutePolyline("");
      setProjectedPolygons([]);
      return;
    }
    projectionTimeoutRef.current = setTimeout(() => projectGeometry(geometry), delay);
  }, [projectGeometry]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoadingData(true);
      setLoadingError(null);

      hydrateWalkHistoryDataset(userId, walkId)
        .then((dataset) => {
          if (!isActive) return;
          setSummaries(dataset.summaries);
          updateSelectedWalk(dataset.selectedWalk ?? null);
          scheduleProjection(dataset.selectedWalk ?? null, 0);
        })
        .catch((error) => {
          console.error("[PastWalksNolli] Failed to load walk history", error);
          setLoadingError("Unable to load walk history.");
          setSummaries([]);
          updateSelectedWalk(null);
        })
        .finally(() => {
          if (!isActive) return;
          setIsLoadingData(false);
        });

      return () => {
        isActive = false;
      };
    }, [updateSelectedWalk, userId, walkId, scheduleProjection])
  );

  useEffect(() => {
    return () => {
      if (projectionTimeoutRef.current) clearTimeout(projectionTimeoutRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close past walks map"
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Past Walks</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.mapContainer} onLayout={(e) => setMapLayout(e.nativeEvent.layout)}>
        <MapView
          ref={mapRef}
          provider={mapProvider as any}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          customMapStyle={
            PAST_WALKS_NOLLI_MAP_STYLE as unknown as MapViewProps["customMapStyle"]
          }
          onMapReady={handleMapReady}
          // NOTE: Some iOS dev builds may lack react-native-maps native event setters,
          // which can trigger "unrecognized selector setOnRegionChangeComplete" crashes.
          // To avoid crashing, only attach region-change listeners on Android.
          {...(Platform.OS === "android"
            ? {
                onRegionChange: () =>
                  scheduleProjection(selectedWalkRef.current, 16),
                onRegionChangeComplete: () =>
                  scheduleProjection(selectedWalkRef.current, 150),
                onLongPress: () => {},
              }
            : {})}
        >
          {projectedPolygons.length > 0 &&
            projectedPolygons.map((polygon) =>
              polygon.rings.map((ringPath, i) => (
                <Polygon
                  key={`${polygon.id}-${i}`}
                  coordinates={[]}
                  fillColor="rgba(0,0,0,1)"
                  strokeColor="rgba(0,0,0,0.6)"
                  strokeWidth={1}
                />
              ))
            )}
        </MapView>

        {(!isMapReady || isLoadingData) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#2ECC71" />
          </View>
        )}
      </View>
    </View>
  );
};

export default PastWalksNolliScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8" },
  headerSafeArea: { backgroundColor: "#F8F8F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTextContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: "#1F1F1F" },
  mapContainer: { flex: 1, backgroundColor: "#FFF" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
