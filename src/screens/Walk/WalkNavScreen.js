import Compass from "@/components/walk/Compass";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deriveBuildingOrder } from "../../utils/deriveUtils";

const normalizeCoords = (v) => {
  if (!v) return null;
  const lat = Number(v.lat ?? v.latitude);
  const lng = Number(v.lng ?? v.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const WalkNavScreen = ({ route }) => {
  const tsp = useMemo(() => {
    const userStart = { lat: 40.712744754012, lng: -74.0059917068915 };
    const places = route.params?.places ?? [];

    const location = normalizeCoords(route.params?.location ?? userStart);
    console.log(location, "📍 WalkNavScreen Location");
    const formattedLocation = {
      lat: location.lat ?? location.latitude,
      lng: location.lng ?? location.longitude,
    };
    console.log("📍 WalkNavScreen Location:", location);
    if (!places.length)
      return { route: [], total_distance_km: 0, est_duration_min: 0 };
    // deriveBuildingOrder should return { route, legs, total_distance_km, est_duration_min, ... }
    return deriveBuildingOrder(places, formattedLocation);
  }, [route.params?.location, route.params?.places]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#fe1",
            borderStyle: "solid",
            padding: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ marginBottom: 8 }}>{tsp.route[0].des_addres}</Text>

          {!tsp.route?.length ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <View style={{ width: 300, height: 300, margin: 16 }}>
              <Compass buildings={tsp.route} />
            </View>
          )}

          {/* Optional summary */}
          {tsp.route?.length > 0 && (
            <Text style={{ marginTop: 8 }}>
              Total: {tsp.total_distance_km} km · ~{tsp.est_duration_min} min
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WalkNavScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
