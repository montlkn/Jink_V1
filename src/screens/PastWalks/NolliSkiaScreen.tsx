import { PassportBackButton } from "@/features/passport";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import type { Region } from "react-native-maps";
import MapView, { Polygon } from "react-native-maps";
import {
    demoWalks,
    MASTER_WALK_ID,
    type DemoWalk,
} from "./nolliDemoData";

// -------------------- Types --------------------
type RootStackParamList = {
  NolliSkia: { walkId?: string } | undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "NolliSkia">;
type Position = { latitude: number; longitude: number };

// -------------------- Constants --------------------
const DEFAULT_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};


// -------------------- Data Processing --------------------
function extractVisitedCoordinates(walks: DemoWalk[], selectedWalkId: string): Position[][] {
  const polygons: Position[][] = [];
  const isMaster = selectedWalkId === MASTER_WALK_ID;
  const activeWalks = isMaster ? walks : walks.filter((w) => w.id === selectedWalkId);

  activeWalks.forEach((walk) => {
    walk.featureCollection.features.forEach((feature) => {
      if (feature.geometry.type !== "Polygon") return;
      const coords = feature.geometry.coordinates[0];
      if (!coords || coords.length < 3) return;

      const positions: Position[] = coords.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
      polygons.push(positions);
    });
  });

  return polygons;
}

// -------------------- Main Screen --------------------
export default function NolliSkiaScreen({ route, navigation }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [walks] = useState<DemoWalk[]>(demoWalks);
  const walkId = route?.params?.walkId;
  
  const [selectedWalkId, setSelectedWalkId] = useState<string>(() => {
    if (walkId && walks.some((w) => w.id === walkId)) {
      return walkId;
    }
    return MASTER_WALK_ID;
  });

  const visitedPolygons = useMemo(
    () => extractVisitedCoordinates(walks, selectedWalkId),
    [walks, selectedWalkId]
  );

  // Fit to visited buildings when selection changes
  useEffect(() => {
    if (!mapRef.current || visitedPolygons.length === 0) return;
    
    const allCoords = visitedPolygons.flat();
    if (allCoords.length === 0) return;

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }, 200);
  }, [selectedWalkId, visitedPolygons]);

  const tabs = useMemo(
    () => [
      { id: MASTER_WALK_ID, label: "All Walks" },
      ...walks.map((walk) => ({ id: walk.id, label: walk.name })),
    ],
    [walks]
  );

  const isMasterView = selectedWalkId === MASTER_WALK_ID;
  const activeSummary = !isMasterView
    ? walks.find((w) => w.id === selectedWalkId)?.summary
    : undefined;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      
      {/* Full-screen Map with CartoDB tiles */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
      >


        {/* Highlight visited buildings */}
        {visitedPolygons.map((coords, index) => (
          <Polygon
            key={`visited-${index}`}
            coordinates={coords}
            fillColor="rgba(26, 26, 26, 0.85)"
            strokeColor="#000000"
            strokeWidth={1.5}
          />
        ))}
      </MapView>

      {/* Floating Header */}
      <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <PassportBackButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.title}>Nolli Map</Text>
          <View style={styles.headerSide} />
        </View>
      </SafeAreaView>

      {/* Floating Bottom Controls */}
      <View style={styles.bottomControls} pointerEvents="box-none">
        {/* Tab Bar */}
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
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          {activeSummary ? (
            <>
              <Text style={styles.summaryLabel}>Lore</Text>
              <Text style={styles.summaryText}>{activeSummary}</Text>
            </>
          ) : (
            <Text style={styles.summaryText}>
              Pan and zoom to explore. Your visited buildings are shown in black.
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
    backgroundColor: "#f2f2f2",
  },
  
  // Header
  headerSafeArea: {
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
    letterSpacing: 0.3,
  },
  
  // Bottom Controls
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    gap: 12,
  },
  tabBar: {
    maxHeight: 48,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tabActive: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  tabText: {
    color: "#666666",
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  
  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#999999",
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
  },
});
