import { Compass, PausePillButton } from "@/features/walks";
import { useFocusEffect } from "@react-navigation/native";
// eslint-disable-next-line no-restricted-imports
import { useAuth } from "@/auth/authProvider";
import { log } from "@/lib/log";
import { goBack, navigate } from "@/navigation/nav";
import { screens } from "@/navigation/routes";
// eslint-disable-next-line no-restricted-imports
import { createAestheticEvent } from "@/services/gateways/aestheticEventGateway";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useOrbTransition } from "../../state/orbTransitionContext";
import { deriveBuildingOrder } from "../../utils/deriveUtils";

const normalizeCoords = (v) => {
  if (!v) return null;
  const lat = Number(v.lat ?? v.latitude);
  const lng = Number(v.lng ?? v.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const WalkNavScreen = ({ route }) => {
  const { pinToJink } = useOrbTransition();
  const { session } = useAuth();
  const [buildingIndex, setBuildingIndex] = useState(0);

  const tsp = useMemo(() => {
    const userStart = { lat: 40.712744754012, lng: -74.0059917068915 };
    const places = route.params?.places ?? [];

    const location = normalizeCoords(route.params?.location ?? userStart);
    const formattedLocation = {
      lat: location.lat ?? location.latitude,
      lng: location.lng ?? location.longitude,
    };
    if (!places.length)
      return { route: [], total_distance_km: 0, est_duration_min: 0 };
    // deriveBuildingOrder should return { route, legs, total_distance_km, est_duration_min, ... }
    return deriveBuildingOrder(places, formattedLocation);
  }, [route.params?.location, route.params?.places]);

  const routeStops = useMemo(() => tsp.route ?? [], [tsp.route]);
  const hasRoute = routeStops.length > 0;
  const currentIndex = hasRoute
    ? Math.min(buildingIndex, routeStops.length - 1)
    : 0;
  const currentStop = hasRoute ? routeStops[currentIndex] : null;

  useFocusEffect(
    useCallback(() => {
      pinToJink(false);
      return () => {};
    }, [pinToJink])
  );

  const handlePause = useCallback(() => {
    pinToJink(true);
    goBack();
  }, [pinToJink]);

  const handleArrived = useCallback(() => {
    if (!hasRoute) return;
    const activeStop = routeStops[currentIndex];
    pinToJink(false);
    navigate(screens.WalkCamera, {
      building: activeStop,
    });
    if (routeStops.length > 0) {
      setBuildingIndex((prev) => (prev + 1) % routeStops.length);
    }
  }, [currentIndex, hasRoute, pinToJink, routeStops]);

  const handleSkip = useCallback(() => {
    if (!hasRoute) return;
    const activeStop = routeStops[currentIndex];

    // Track quick_dismiss event
    if (session?.user?.id && activeStop) {
      createAestheticEvent({
        userId: session.user.id,
        eventType: 'quick_dismiss',
        buildingBbl: activeStop.bbl || activeStop.bin,
        payload: {
          building_name: activeStop.name || activeStop.title,
          dismissed_at_index: currentIndex
        },
      }).catch((err) => log.warn('[WalkNav] Failed to track quick_dismiss', err));
    }

    // Move to next building
    if (routeStops.length > 0) {
      setBuildingIndex((prev) => (prev + 1) % routeStops.length);
    }
  }, [currentIndex, hasRoute, routeStops, session?.user?.id]);

  const progressLabel = hasRoute
    ? `${currentIndex + 1}/${routeStops.length}`
    : null;
  const nextAddress =
    currentStop?.des_addres ??
    currentStop?.name ??
    currentStop?.title ??
    "Generating your route…";
  const summaryDistance = formatKilometers(tsp.total_distance_km);
  const summaryDuration =
    Number.isFinite(tsp.est_duration_min) && tsp.est_duration_min > 0
      ? `${Math.round(tsp.est_duration_min)} min`
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <PausePillButton onPress={handlePause} />
        </View>
        <View style={styles.body}>
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>Next Stop</Text>
            <Text style={styles.nextAddress} numberOfLines={2}>
              {nextAddress}
            </Text>
            {progressLabel ? (
              <Text style={styles.nextMeta}>{progressLabel}</Text>
            ) : null}
          </View>

          <View style={styles.compassSection}>
            {hasRoute ? (
              <Compass
                buildings={routeStops}
                buildingIndex={currentIndex}
                size={320}
              />
            ) : (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#1B1B1B" />
                <Text style={styles.loadingText}>
                  Calculating your jink…
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  !hasRoute && styles.disabledButton,
                  pressed && hasRoute ? styles.primaryButtonPressed : null,
                ]}
                onPress={handleArrived}
                disabled={!hasRoute}
              >
                <Text style={styles.primaryButtonLabel}>
                  {hasRoute ? "I'm Here" : "Loading"}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.skipButton,
                  !hasRoute && styles.disabledButton,
                  pressed && hasRoute ? styles.skipButtonPressed : null,
                ]}
                onPress={handleSkip}
                disabled={!hasRoute}
              >
                <Text style={styles.skipButtonLabel}>Skip</Text>
              </Pressable>
            </View>
            {hasRoute && (summaryDistance || summaryDuration) ? (
              <Text style={styles.routeSummary}>
                {summaryDistance ? summaryDistance : ""}
                {summaryDistance && summaryDuration ? " · " : ""}
                {summaryDuration ? `~${summaryDuration}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WalkNavScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    alignItems: "flex-start",
  },
  body: {
    flex: 1,
    paddingTop: 16,
    justifyContent: "space-between",
  },
  nextCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  nextLabel: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "600",
    color: "#62626D",
    textTransform: "uppercase",
  },
  nextAddress: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#141417",
  },
  nextMeta: {
    marginTop: 12,
    fontSize: 14,
    color: "#3C3C43",
    opacity: 0.72,
  },
  compassSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#3C3C43",
    opacity: 0.7,
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: "#141417",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#141417",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  skipButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  skipButtonLabel: {
    color: "#141417",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  routeSummary: {
    marginTop: 16,
    fontSize: 14,
    color: "#3C3C43",
    opacity: 0.7,
    textAlign: "center",
  },
});

function formatKilometers(value) {
  if (!Number.isFinite(value)) return null;
  if (value < 1) {
    return `${Math.round(value * 1000)} m`;
  }
  return `${value < 10 ? value.toFixed(1) : value.toFixed(0)} km`;
}
