import { useAuth } from "@/auth/authProvider";
import { Compass, PausePillButton } from "@/features/walks";
import { log } from "@/lib/log";
import { goBack, navigate } from "@/navigation/nav";
import { screens } from "@/navigation/routes";
import { calculateWalkingETA, formatDistance, getBuildingDisplayName, haversineDistance } from "@/utils/buildingUtils";
// eslint-disable-next-line no-restricted-imports
import { createAestheticEvent } from "@/services/gateways/aestheticEventGateway";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { DirectionalGlow } from "../../components/navigation/DirectionalGlow";
import { useOrbTransition } from "../../state/orbTransitionContext";
import { deriveBuildingOrder } from "../../utils/deriveUtils";

const normalizeCoords = (v) => {
  if (!v) return null;
  const lat = Number(v.lat ?? v.latitude);
  const lng = Number(v.lng ?? v.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

// Calculate bearing from point A to point B (in degrees, 0-360)
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

const WalkNavScreen = ({ route, navigation }) => {
  const { pinToJink } = useOrbTransition();
  const { session } = useAuth();
  const [buildingIndex, setBuildingIndex] = useState(0);
  const [visitedBuildings, setVisitedBuildings] = useState(new Set()); // Track which buildings user has verified
  const [walkXp, setWalkXp] = useState(0); // Track XP earned during walk

  // Real-time location tracking
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userHeading, setUserHeading] = useState(0);
  const locationSubscriptionRef = useRef(null);
  const magnetometerSubscriptionRef = useRef(null);

  // Get walk params
  const walkId = route.params?.walkId;
  const xpMultiplier = route.params?.xpMultiplier || 1;
  const routeTier = route.params?.routeTier || 'aesthetic';

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
    return deriveBuildingOrder(places, formattedLocation);
  }, [route.params?.location, route.params?.places]);

  const routeStops = useMemo(() => tsp.route ?? [], [tsp.route]);
  const hasRoute = routeStops.length > 0;
  const currentIndex = hasRoute
    ? Math.min(buildingIndex, routeStops.length - 1)
    : 0;
  const currentStop = hasRoute ? routeStops[currentIndex] : null;
  const isLastBuilding = currentIndex === routeStops.length - 1;

  useFocusEffect(
    useCallback(() => {
      pinToJink(false);
      return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walkId, session])
  );

  // Real-time location tracking with battery-optimized updates
  useEffect(() => {
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          log.warn('[WalkNav] Location permission not granted');
          return;
        }

        // Get initial location
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (isMounted) {
          setCurrentLocation({
            lat: initial.coords.latitude,
            lng: initial.coords.longitude,
          });
        }

        // Watch location with smart throttling (update every 5 seconds or 10m movement)
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 5000, // 5 seconds
            distanceInterval: 10, // 10 meters
          },
          (loc) => {
            if (isMounted) {
              setCurrentLocation({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
              });
              log.info('[WalkNav] Location updated', {
                lat: loc.coords.latitude.toFixed(6),
                lng: loc.coords.longitude.toFixed(6),
              });
            }
          }
        );
      } catch (error) {
        log.error('[WalkNav] Location tracking error', error);
      }
    };

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, []);

  // Magnetometer for compass heading
  useEffect(() => {
    let isMounted = true;

    try {
      Magnetometer.setUpdateInterval(250);
      magnetometerSubscriptionRef.current = Magnetometer.addListener((data) => {
        if (!isMounted) return;
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = 90 - angle;
        const normalized = ((angle % 360) + 360) % 360;
        setUserHeading(normalized);
      });
    } catch (error) {
      log.error('[WalkNav] Magnetometer error', error);
    }

    return () => {
      isMounted = false;
      if (magnetometerSubscriptionRef.current) {
        magnetometerSubscriptionRef.current.remove();
        magnetometerSubscriptionRef.current = null;
      }
    };
  }, []);

  // Auto-complete when last building is visited
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we're returning from a successful scan
      const scanResult = route.params?.scanResult;
      if (scanResult && scanResult.verified) {
        log.info('[WalkNav] Building verified via scan', { 
          buildingBin: scanResult.buildingBin,
          index: currentIndex 
        });
        
        // Mark building as visited
        setVisitedBuildings(prev => new Set([...prev, currentIndex]));
        
        // Award XP for this building (base 50 XP * multiplier)
        const buildingXp = Math.round(50 * xpMultiplier);
        setWalkXp(prev => prev + buildingXp);
        
        // Track the visit event
        if (session?.user?.id && currentStop) {
          createAestheticEvent({
            userId: session.user.id,
            eventType: 'building_scan',
            eventSubtype: 'repeat', // Default to repeat for verified visits
            buildingBbl: currentStop.bbl || currentStop.bin,
            payload: {
              building_name: currentStop.name || currentStop.title,
              walk_id: walkId,
              xp_earned: buildingXp,
              visit_index: currentIndex,
              verification_method: 'scan',
            },
          }).catch((err) => log.warn('[WalkNav] Failed to track verified visit', err));
        }

        // Move to next building or complete walk
        if (isLastBuilding) {
          // Walk complete! Navigate to summary
          handleWalkComplete();
        } else {
          setBuildingIndex(prev => prev + 1);
        }
        
        // Clear the scan result param
        navigation.setParams({ scanResult: undefined });
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, route.params?.scanResult, currentIndex, isLastBuilding, currentStop, session?.user?.id, walkId, xpMultiplier]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlePause = useCallback(() => {
    pinToJink(true);
    goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, walkId]);

  // "I'm Here" now opens camera for verification scan
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleArrived = useCallback(() => {
    if (!hasRoute || !currentStop) return;
    
    // Navigate to scan screen with building context for verification
    navigate(screens.Scan, {
      verificationMode: true,
      expectedBuilding: {
        bin: currentStop.bin,
        name: getBuildingDisplayName(currentStop),
        address: currentStop.des_addres || currentStop.address,
        lat: currentStop.lat || currentStop.latitude,
        lng: currentStop.lng || currentStop.longitude,
      },
      walkId: walkId,
      returnScreen: screens.WalkNav,
    });
  }, [hasRoute, currentStop, walkId]);

  // Handle skip button - mark as visited and advance
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          dismissed_at_index: currentIndex,
          walk_id: walkId,
        },
      }).catch((err) => log.warn('[WalkNav] Failed to track quick_dismiss', err));
    }

    // Check if this is the last building
    if (isLastBuilding) {
      // Walk complete (even if skipped)
      handleWalkComplete();
    } else {
      // Move to next building
      setBuildingIndex((prev) => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, hasRoute, isLastBuilding, routeStops, session?.user?.id, walkId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleWalkComplete = useCallback(() => {
    log.info('[WalkNav] Walk complete', {
      walkId,
      totalBuildings: routeStops.length,
      visitedCount: visitedBuildings.size,
      totalXp: walkXp,
    });

    // Navigate to walk summary with stats
    navigate(screens.WalkSummary, {
      walkId,
      stats: {
        totalBuildings: routeStops.length,
        visitedBuildings: visitedBuildings.size,
        skippedBuildings: routeStops.length - visitedBuildings.size,
        totalXp: walkXp,
        xpMultiplier,
        routeTier,
        distance: tsp.total_distance_km,
        duration: tsp.est_duration_min,
      },
      buildings: routeStops.map((stop, idx) => ({
        ...stop,
        visited: visitedBuildings.has(idx),
      })),
    });
  }, [walkId, routeStops, visitedBuildings, walkXp, xpMultiplier, routeTier, tsp]);

  // Manual walk complete button (for testing or if user wants to end early)
  const handleEndWalk = useCallback(() => {
    Alert.alert(
      "End Walk?",
      `You've visited ${visitedBuildings.size} of ${routeStops.length} buildings. End the walk now?`,
      [
        { text: "Continue", style: "cancel" },
        { text: "End Walk", onPress: handleWalkComplete },
      ]
    );
  }, [visitedBuildings.size, routeStops.length, handleWalkComplete]);

  const progressLabel = hasRoute
    ? `${currentIndex + 1}/${routeStops.length}`
    : null;
  
  // Use validated building name
  const nextAddress = hasRoute && currentStop
    ? getBuildingDisplayName(currentStop)
    : "Generating your route…";
  
  // Calculate distance and ETA to current stop (updates in real-time)
  const distanceToStop = useMemo(() => {
    if (!hasRoute || !currentStop) return null;
    // Use real-time location if available, otherwise fall back to route params
    const userLoc = currentLocation || normalizeCoords(route.params?.location);
    if (!userLoc) return null;
    const stopLoc = normalizeCoords(currentStop);
    if (!stopLoc) return null;
    return haversineDistance(userLoc, stopLoc);
  }, [hasRoute, currentStop, currentLocation, route.params?.location]);

  // Calculate bearing to target for directional glow
  const targetBearing = useMemo(() => {
    if (!currentLocation || !currentStop) return 0;
    const stopLoc = normalizeCoords(currentStop);
    if (!stopLoc) return 0;
    return calculateBearing(currentLocation.lat, currentLocation.lng, stopLoc.lat, stopLoc.lng);
  }, [currentLocation, currentStop]);

  // Distance in meters for the glow component
  const distanceMeters = distanceToStop ? distanceToStop * 1000 : 1000;

  const nextStopDistance = distanceToStop ? formatDistance(distanceToStop) : null;
  const nextStopETA = distanceToStop ? calculateWalkingETA(distanceToStop) : null;
  
  const summaryDistance = formatDistance(tsp.total_distance_km);
  const summaryDuration =
    Number.isFinite(tsp.est_duration_min) && tsp.est_duration_min > 0
      ? `${Math.round(tsp.est_duration_min)} min`
      : null;

  // Extract walking directions from OSRM route data
  const routeData = route.params?.routeData;
  const currentLeg = routeData?.legs?.[currentIndex];
  const walkingInstruction = useMemo(() => {
    if (!currentLeg) return null;

    const steps = currentLeg.steps || [];
    const firstStep = steps.find(step => step.distance > 20);

    if (firstStep && firstStep.maneuver) {
      const maneuver = firstStep.maneuver;
      const type = maneuver.type;
      const modifier = maneuver.modifier;
      const streetName = firstStep.name || "";

      let instruction = "";

      if (type === "depart") {
        instruction = streetName ? `Head ${modifier || "straight"} on ${streetName}` : `Head ${modifier || "straight"}`;
      } else if (type === "turn") {
        const direction = modifier === "left" ? "left" : modifier === "right" ? "right" : "straight";
        instruction = streetName ? `Turn ${direction} onto ${streetName}` : `Turn ${direction}`;
      } else if (type === "new name") {
        instruction = streetName ? `Continue on ${streetName}` : "Continue straight";
      } else if (type === "arrive") {
        instruction = "Arrive at destination";
      } else {
        instruction = streetName ? `Continue on ${streetName}` : "Continue straight";
      }

      const distanceM = Math.round(firstStep.distance);
      const feet = distanceM * 3.28084;
      
      if (feet < 2640) {
        instruction += ` (${Math.round(feet)} ft)`;
      } else {
        const miles = distanceM * 0.000621371;
        instruction += ` (${miles.toFixed(1)} mi)`;
      }

      return instruction;
    }

    const distanceKm = currentLeg.distanceKm;
    const durationMin = currentLeg.durationMin;

    const feet = distanceKm * 3280.84;
    let distanceText;
    
    if (feet < 2640) {
      distanceText = `${Math.round(feet)} ft`;
    } else {
      const miles = distanceKm * 0.621371;
      distanceText = `${miles.toFixed(1)} mi`;
    }

    const durationText = durationMin < 1 ? "< 1 min" : `${Math.round(durationMin)} min`;

    return `Walk ${distanceText} · ${durationText}`;
  }, [currentLeg]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Directional Glow Indicator - hot/cold navigation aid */}
      <DirectionalGlow
        targetBearing={targetBearing}
        userHeading={userHeading}
        distanceMeters={distanceMeters}
        isActive={hasRoute && currentStop !== null}
      />
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <PausePillButton onPress={handlePause} />
          {/* XP Counter */}
          {walkXp > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{walkXp} XP</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>Next Stop</Text>
            <Text style={styles.nextAddress} numberOfLines={2}>
              {nextAddress}
            </Text>
            {/* Distance and ETA */}
            {nextStopDistance && nextStopETA ? (
              <View style={styles.etaRow}>
                <Text style={styles.etaText}>{nextStopDistance} away · {nextStopETA}</Text>
              </View>
            ) : null}
            {walkingInstruction ? (
              <View style={styles.directionRow}>
                <Text style={styles.directionText}>{walkingInstruction}</Text>
              </View>
            ) : null}
            {progressLabel ? (
              <Text style={styles.nextMeta}>{progressLabel} · {visitedBuildings.size} verified</Text>
            ) : null}
          </View>

          <View style={styles.compassSection}>
            {hasRoute ? (
              <Compass
                buildings={routeStops}
                buildingIndex={currentIndex}
                size={260}
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
                  {hasRoute ? "Verify I'm Here" : "Loading"}
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
            {/* End Walk Early Button */}
            {visitedBuildings.size > 0 && (
              <Pressable style={styles.endWalkButton} onPress={handleEndWalk}>
                <Text style={styles.endWalkText}>End Walk Early</Text>
              </Pressable>
            )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    paddingTop: 16,
    justifyContent: "space-between",
  },
  nextCard: {
    backgroundColor: "#FFFFFF",  // Explicit color for shadow optimization
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
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  etaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369a1",
  },
  directionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eaeaeaff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c8c8c8ff",
  },
  directionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#707070ff",
    flex: 1,
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
    backgroundColor: "#141417",  // Solid color for shadow optimization
    borderRadius: 28,
    paddingVertical: 16,
    top: 16,
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
    top: 16,
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
    top: 16,
    fontSize: 14,
    color: "#3C3C43",
    opacity: 0.7,
    textAlign: "center",
  },
  endWalkButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  endWalkText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});


