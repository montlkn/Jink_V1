import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { MapViewProps, Polygon, PROVIDER_GOOGLE } from "react-native-maps";

import { useWalksData } from "@/features/walks";
import { PAST_WALKS_NOLLI_MAP_STYLE } from "../../constants/mapStyles";
import type { GeoJsonFeature, WalkGeometry } from "../../types/walks";
import { projectFeatureToScreen, screenPointsToPath } from "../../utils/mapProjection";

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

type ProjectedPolygon = {
  id: string;
  rings: string[];
};

const PastWalksNolliScreen: React.FC<Props> = ({ navigation, route }) => {
  const { walkId } = route.params ?? {};
  const mapRef = useRef<MapView>(null);
  const mapProvider = useMemo(() => PROVIDER_GOOGLE, []);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });
  const [projectedPolygons, setProjectedPolygons] = useState<ProjectedPolygon[]>([]);
  const projectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedWalkRef = useRef<WalkGeometry | null>(null);

  const walksState = useWalksData();
  const selectWalk = walksState.select;

  const readyValue = walksState.status === "ready" ? walksState.value : null;
  const selectedWalk = readyValue?.selectedWalk ?? null;
  const selectedWalkId = readyValue?.selectedWalkId ?? null;
  const isSelecting = readyValue?.isSelecting ?? false;
  const isLoading = walksState.status === "loading";
  const errorMessage =
    walksState.status === "error"
      ? "Unable to load walk history."
      : null;

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const handleMapReady: MapViewProps["onMapReady"] = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const projectGeometry = useCallback(async (geometry: WalkGeometry | null) => {
    const map = mapRef.current;
    if (!map || !geometry || mapLayout.width <= 0 || mapLayout.height <= 0) return;

    try {
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
      setProjectedPolygons([]);
      return;
    }
    projectionTimeoutRef.current = setTimeout(() => projectGeometry(geometry), delay);
  }, [projectGeometry]);

  useEffect(() => {
    selectedWalkRef.current = selectedWalk;
    if (selectedWalk) {
      scheduleProjection(selectedWalk, 0);
    } else {
      setProjectedPolygons([]);
    }
  }, [selectedWalk, scheduleProjection]);

  useEffect(() => {
    if (selectedWalk) {
      scheduleProjection(selectedWalk, 0);
    }
  }, [mapLayout.height, mapLayout.width, scheduleProjection, selectedWalk]);

  useEffect(() => {
    if (!walkId || walksState.status !== "ready") {
      return;
    }

    if (selectedWalkId === walkId || isSelecting) {
      return;
    }

    selectWalk(walkId).catch((error) => {
      console.error("[PastWalksNolli] Failed to select walk from route param", error);
    });
  }, [walkId, walksState.status, selectedWalkId, isSelecting, selectWalk]);

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

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

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

        {(!isMapReady || isLoading || isSelecting) && (
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
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.12)",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
    textAlign: "center",
  },
});
