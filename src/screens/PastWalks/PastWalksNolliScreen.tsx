import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { MapViewProps, Polygon, PROVIDER_GOOGLE, Region } from "react-native-maps";
import Svg, { Defs, Mask, Path, Polyline, Rect } from "react-native-svg";

import { useAuth } from "../../auth/authProvider";
import { PAST_WALKS_NOLLI_MAP_STYLE } from "../../constants/mapStyles";
import {
  fetchWalkGeometry,
  hydrateWalkHistoryDataset,
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
  // Slightly larger feather to show context around buildings
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
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let validPoints = 0;

  coordinates.forEach((point) => {
    if (!point) return;
    const { latitude, longitude } = point;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    if (latitude < minLat) minLat = latitude;
    if (latitude > maxLat) maxLat = latitude;
    if (longitude < minLng) minLng = longitude;
    if (longitude > maxLng) maxLng = longitude;
    validPoints += 1;
  });

  if (validPoints === 0) {
    return null;
  }

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

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMapReady: MapViewProps["onMapReady"] = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleFitToWalk = useCallback(
    (walk: WalkGeometry | null) => {
      // Map fitting is disabled to avoid "no command" errors
      // The map will show the default region or last user position
      // This is a known limitation with react-native-maps on some platforms
    },
    []
  );

  const projectGeometry = useCallback(
    async (geometry: WalkGeometry | null) => {
      const map = mapRef.current;
      if (!map || !geometry) {
        setRoutePolyline("");
        setProjectedPolygons([]);
        return;
      }

      if (mapLayout.width <= 0 || mapLayout.height <= 0) {
        return;
      }

      try {
        const routePoints = await projectRouteToScreen(map, geometry.route);
        const routePolylineString = screenPointsToPolyline(routePoints);

        const polygonResults: ProjectedPolygon[] = [];
        for (let i = 0; i < geometry.buildings.length; i += 1) {
          const feature = geometry.buildings[i] as GeoJsonFeature;
          const rings = await projectFeatureToScreen(map, feature);
          const ringPaths = rings.map((ring) => screenPointsToPath(ring)).filter(Boolean);

          if (ringPaths.length > 0) {
            const featureId = feature.id ?? (feature.properties?.id as string | undefined) ?? `feature-${i}`;
            polygonResults.push({
              id: featureId,
              rings: ringPaths,
            });
          }
        }

        if (selectedWalkRef.current?.walkId !== geometry.walkId) {
          return;
        }

        setRoutePolyline(routePolylineString);
        setProjectedPolygons(polygonResults);
      } catch (error) {
        console.error("[PastWalksNolli] Projection failed", error);
      }
    },
    [mapLayout.height, mapLayout.width]
  );

  const scheduleProjection = useCallback(
    (geometry: WalkGeometry | null, delay = 150) => {
      if (projectionTimeoutRef.current) {
        clearTimeout(projectionTimeoutRef.current);
        projectionTimeoutRef.current = null;
      }

      if (!geometry || !mapRef.current) {
        setRoutePolyline("");
        setProjectedPolygons([]);
        return;
      }

      if (delay <= 0) {
        projectGeometry(geometry);
        return;
      }

      projectionTimeoutRef.current = setTimeout(() => {
        projectGeometry(geometry);
      }, delay);
    },
    [projectGeometry]
  );

  const headerSubtitle = useMemo(() => {
    if (isLoadingData) {
      return "Loading your discovered walks…";
    }
    if (loadingError) {
      return "We couldn't load your past walks. Try again shortly.";
    }
    if (!selectedWalk) {
      return "Select a walk to review its journey.";
    }

    const summary = summaries.find((item) => item.id === selectedWalk.walkId);
    if (!summary) {
      return `Showing discoveries from walk ${selectedWalk.walkId}.`;
    }

    return formatSummaryTitle(summary);
  }, [isLoadingData, loadingError, selectedWalk, summaries]);

  const mapBuildings = useMemo(() => {
    if (!selectedWalk) return [] as MapPolygon[];

    const toLatLng = (ring: number[][]) =>
      ring
        .filter((coord) => Array.isArray(coord) && coord.length >= 2)
        .map(([longitude, latitude]) => ({ latitude, longitude }));

    const polygons: MapPolygon[] = [];
    selectedWalk.buildings.forEach((feature, featureIndex) => {
      const targetFeature = feature as GeoJsonFeature;
      if (!targetFeature?.geometry) return;
      const featureId =
        targetFeature.id ?? (targetFeature.properties?.id as string | undefined) ?? `building-${featureIndex}`;

      if (targetFeature.geometry.type === "Polygon") {
        const [outer, ...holes] = targetFeature.geometry.coordinates as number[][][];
        if (!outer) return;
        const outerCoords = toLatLng(outer);
        if (outerCoords.length < 3) return;
        polygons.push({
          id: `${featureId}-0`,
          coordinates: outerCoords,
          holes: holes
            .map((hole) => toLatLng(hole))
            .filter((coords) => coords.length >= 3),
        });
      } else {
        (targetFeature.geometry.coordinates as number[][][][]).forEach((polygonCoords, polygonIndex) => {
          const [outer, ...holes] = polygonCoords;
          if (!outer) return;
          const outerCoords = toLatLng(outer);
          if (outerCoords.length < 3) return;
          polygons.push({
            id: `${featureId}-${polygonIndex}`,
            coordinates: outerCoords,
            holes: holes
              .map((hole) => toLatLng(hole))
              .filter((coords) => coords.length >= 3),
          });
        });
      }
    });

    return polygons;
  }, [selectedWalk]);

  const handleWalkSelect = useCallback(
    async (candidateId: string) => {
      if (!candidateId || candidateId === selectedWalk?.walkId) {
        return;
      }

      setIsSelectingWalk(true);
      setLoadingError(null);

      try {
        const geometry = await fetchWalkGeometry(candidateId);
        updateSelectedWalk(geometry);
        handleFitToWalk(geometry);
        scheduleProjection(geometry, 0);
      } catch (error) {
        console.error("[PastWalksNolli] Failed to load selected walk", error);
        setLoadingError("Unable to load that walk right now.");
      } finally {
        setIsSelectingWalk(false);
      }
    },
    [handleFitToWalk, scheduleProjection, selectedWalk?.walkId, updateSelectedWalk]
  );

  const handleMapLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!width || !height) return;
    setMapLayout((prev) => {
      if (prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
  }, []);

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
          handleFitToWalk(dataset.selectedWalk ?? null);
          scheduleProjection(dataset.selectedWalk ?? null, 0);
        })
        .catch((error) => {
          if (!isActive) return;
          console.error("[PastWalksNolli] Failed to load walk history", error);
          setLoadingError("Unable to load walk history.");
          setSummaries([]);
          updateSelectedWalk(null);
          scheduleProjection(null, 0);
        })
        .finally(() => {
          if (!isActive) return;
          setIsLoadingData(false);
        });

      return () => {
        isActive = false;
      };
    }, [handleFitToWalk, scheduleProjection, updateSelectedWalk, userId, walkId])
  );

  const activeWalkId = selectedWalk?.walkId ?? null;

  useEffect(() => {
    return () => {
      if (projectionTimeoutRef.current) {
        clearTimeout(projectionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isMapReady) {
      handleFitToWalk(selectedWalk ?? null);
    }
  }, [handleFitToWalk, isMapReady, selectedWalk]);

  useEffect(() => {
    if (!isMapReady) return;
    if (mapLayout.width <= 0 || mapLayout.height <= 0) return;
    scheduleProjection(selectedWalk ?? null, 0);
  }, [isMapReady, mapLayout.height, mapLayout.width, scheduleProjection, selectedWalk]);

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
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.modePill}>
              <Text style={styles.modePillText}>Nolli View</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {summaries.length > 0 && (
        <View style={styles.walkSelectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walkSelectorScroll}
          >
            {summaries.map((summary) => {
              const isActive = summary.id === activeWalkId;
              const chipLabel = formatSummaryTitle(summary);
              return (
                <Pressable
                  key={summary.id}
                  onPress={() => handleWalkSelect(summary.id)}
                  style={[styles.walkChip, isActive ? styles.walkChipActive : null]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to walk from ${chipLabel}`}
                  disabled={isSelectingWalk && !isActive}
                >
                  <Text style={[styles.walkChipText, isActive ? styles.walkChipTextActive : null]}>
                    {chipLabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.mapContainer} onLayout={handleMapLayout}>
        <MapView
          ref={mapRef}
          provider={mapProvider}
          style={StyleSheet.absoluteFill}
          initialRegion={DEFAULT_REGION}
          customMapStyle={PAST_WALKS_NOLLI_MAP_STYLE as unknown as MapViewProps["customMapStyle"]}
          onMapReady={handleMapReady}
          onRegionChange={() => scheduleProjection(selectedWalkRef.current, 16)}
          onRegionChangeComplete={() => scheduleProjection(selectedWalkRef.current, 150)}
        >
          {mapBuildings.map((polygon) => (
            <Polygon
              key={polygon.id}
              coordinates={polygon.coordinates}
              holes={polygon.holes}
              fillColor="rgba(0, 0, 0, 1)"
              strokeColor="rgba(0, 0, 0, 0.6)"
              strokeWidth={1}
            />
          ))}
        </MapView>

        {(!isMapReady || isLoadingData || isSelectingWalk) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#2ECC71" />
              <Text style={styles.loadingText}>
                {!isMapReady
                  ? "Preparing map…"
                  : isSelectingWalk
                  ? "Loading walk details…"
                  : "Loading walk data…"}
              </Text>
            </View>
          </View>
        )}

        <View pointerEvents="none" style={styles.fogOverlayContainer}>
          {mapLayout.width > 0 && mapLayout.height > 0 && (
            <Svg width={mapLayout.width} height={mapLayout.height}>
              <Defs>
                <Mask id={MASK_ID}>
                  <Rect x={0} y={0} width={mapLayout.width} height={mapLayout.height} fill="black" />
                  {projectedPolygons.map((polygon) =>
                    polygon.rings.map((ringPath, ringIndex) => (
                      <React.Fragment key={`${polygon.id}-${ringIndex}`}>
                        {FEATHER_STEPS.map((step, stepIndex) => (
                          <Path
                            key={`${polygon.id}-${ringIndex}-feather-${stepIndex}`}
                            d={ringPath}
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth={step.strokeWidth}
                            strokeOpacity={step.opacity}
                            strokeLinejoin="round"
                          />
                        ))}
                        <Path
                          d={ringPath}
                          fill="#FFFFFF"
                          stroke="#FFFFFF"
                          strokeWidth={1}
                          strokeLinejoin="round"
                        />
                      </React.Fragment>
                    ))
                  )}
                  {routePolyline
                    ? (
                      <React.Fragment>
                        {FEATHER_STEPS.map((step, stepIndex) => (
                          <Polyline
                            key={`route-feather-${stepIndex}`}
                            points={routePolyline}
                            stroke="#FFFFFF"
                            strokeWidth={step.strokeWidth}
                            strokeOpacity={step.opacity}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        ))}
                        <Polyline
                          points={routePolyline}
                          stroke="#FFFFFF"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </React.Fragment>
                    )
                    : null}
                </Mask>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={mapLayout.width}
                height={mapLayout.height}
                fill={FOG_COLOR}
                mask={`url(#${MASK_ID})`}
              />
              {routePolyline ? (
                <Polyline
                  points={routePolyline}
                  stroke="#E63946"
                  strokeWidth={4}
                  strokeDasharray="14 10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
            </Svg>
          )}
        </View>

        {!isLoadingData && loadingError && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusMessageText}>{loadingError}</Text>
          </View>
        )}

        {!isLoadingData && !loadingError && !selectedWalk && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusMessageText}>No past walks yet. Explore to reveal the map.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default PastWalksNolliScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  headerSafeArea: {
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 6, android: 12, default: 12 }),
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B6B6B",
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 12,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  modePillText: {
    fontSize: 12,
    color: "#1F1F1F",
    fontWeight: "500",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  walkSelectorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F8F8F8",
  },
  walkSelectorScroll: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  walkChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginRight: 12,
  },
  walkChipActive: {
    backgroundColor: "#2ECC71",
    borderColor: "#2ECC71",
  },
  walkChipText: {
    fontSize: 13,
    color: "#1F1F1F",
    fontWeight: "500",
  },
  walkChipTextActive: {
    color: "#FFFFFF",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    minWidth: 160,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#2ECC71",
    fontWeight: "500",
    textAlign: "center",
  },
  statusMessage: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusMessageText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
  },
  fogOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});
