import { useAuth } from "@/auth/authProvider";
import { useAestheticProfile } from "@/features/aesthetic/useAestheticProfile";
import { log } from "@/lib/log";
import { screens } from "@/navigation/routes";
// eslint-disable-next-line no-restricted-imports
import { startWalk } from '@/services/gateways';
// eslint-disable-next-line no-restricted-imports
import { getUserStyleExposure } from '@/services/gateways/userBehaviorGateway';
// eslint-disable-next-line no-restricted-imports
import { buildTimeConstrainedRoute } from '@/services/routeBuilderService';
// eslint-disable-next-line no-restricted-imports
import { fetchNearbyBuildingsFromDB } from '@/services/buildingService';
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, LayoutAnimation, Platform, StyleSheet, UIManager, View } from "react-native";
import MultiplierGlow from "../../components/glow/MultiplierGlow";
import StreamingInstructionText from "../../components/walk/StreamingInstructionText";
import TimerDisplay from "../../components/walk/TimerDisplay";
import TimeSlider from "../../components/walk/TimeSlider";
import TimeStepper from "../../components/walk/TimeStepper";
import XpBonusIndicator from "../../components/walk/XpBonusIndicator";
import ArchetypeOrb from "../../features/orb/ArchetypeOrb";
import { useOrbTransition } from "../../state/orbTransitionContext";
import { DESIGNER_REPUBLIC_THEME } from "../../theme/designer_republic";
import { getWalkDurationBonus } from "../../utils/walkXpBonus";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}


const WalkStartScreen = ({ navigation, route }) => {
  const { pinToJink, orbData } = useOrbTransition();
  const { profile } = useAestheticProfile();
  const { session } = useAuth();
  const entryProgress = useRef(new Animated.Value(0)).current;

  const sliderScale = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0.85, 0.95, 1],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const timerOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.12, 1],
        outputRange: [0, 1, 1],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const sliderOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: [0, 1, 1],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const instructionOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.18, 1],
        outputRange: [0, 0.95, 1],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const timerTranslateY = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-14, 0],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const sliderTranslateY = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const instructionTranslateY = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const stepperOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const [time, setTime] = useState(45);
  const [location, setLocation] = useState({
    latitude: 40.7128,
    longitude: -74.006,
  });
  const [isFetching, setIsFetching] = useState(false);
  const hapticsCancelRef = useRef(null);

  // Calculate XP bonus based on current time selection
  const xpBonus = useMemo(() => getWalkDurationBonus(time), [time]);

  // Animate background color change
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [xpBonus.multiplier]);

  const startLaunchHaptics = useCallback(() => {
    // Continuous stuttery loop until cancelled
    let active = true;
    const timeouts = new Set();

    const schedule = (fn, delay) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        if (!active) return;
        fn();
      }, delay);
      timeouts.add(id);
    };

    const burst = () => {
      // Two quick taps
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 0);
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 60);
      // Stutter run
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 120);
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 180);
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 240);
      // Punch
      schedule(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 320);
      // Short rest before next burst
      schedule(() => {
        if (active) burst();
      }, 520);
    };

    burst();
    const cancel = () => {
      active = false;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
    hapticsCancelRef.current = cancel;
    return cancel;
  }, []);

  useFocusEffect(
    useCallback(() => {
      entryProgress.stopAnimation();
      entryProgress.setValue(0);

      const animation = Animated.spring(entryProgress, {
        toValue: 1,
        speed: 20,
        bounciness: 5,
        useNativeDriver: true,
      });

      animation.start();

      return () => {
        animation.stop();
        entryProgress.stopAnimation();
      };
    }, [entryProgress])
  );

  useFocusEffect(
    useCallback(() => {
      pinToJink(true);
    }, [pinToJink])
  );

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const fetchLocation = async () => {
      try {
        log.info("[walkStart] Requesting location permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        log.info("[walkStart] Permission status:", status);

        if (status !== "granted") {
          Alert.alert(
            "Location Required",
            "This app needs location access to find nearby buildings. Please enable location in Settings.",
            [{ text: "OK" }]
          );
          return;
        }

        log.info("[walkStart] Fetching current position (attempt ${retryCount + 1}/${maxRetries})...");

        // Use same accuracy as ScanScreen for consistency
        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        const { latitude, longitude } = locationData.coords;
        setLocation({ latitude, longitude });
        log.info("[walkStart] Location acquired successfully", { latitude, longitude });
      } catch (error) {
        log.error("[walkStart] Location error (attempt ${retryCount + 1}):", {
          message: error.message,
          code: error.code,
        });

        retryCount++;

        if (retryCount < maxRetries) {
          log.info("[walkStart] Retrying location fetch in 2 seconds...");
          setTimeout(fetchLocation, 2000);
        } else {
          Alert.alert(
            "Location Error",
            "Unable to get your location after multiple attempts. Please check:\n\n• Location Services are enabled in Settings\n• This app has location permission\n• You're not indoors with poor GPS signal\n• Try moving to a window or outdoors",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Try Again", onPress: () => { retryCount = 0; fetchLocation(); } }
            ]
          );
        }
      }
    };

    fetchLocation();
  }, []);

  const handleStartWalk = useCallback(async () => {
    if (isFetching) return;

    try {
      setIsFetching(true);
      startLaunchHaptics();

      // NEW: Query Buildings DB directly with higher limit (200 buildings)
      log.info("[walkStart] Fetching nearby buildings from Buildings DB", {
        location,
        targetDuration: time,
      });

      const nearbyPlaces = await fetchNearbyBuildingsFromDB({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: 1.0, // 1 km radius
        limit: 200, // Much higher than Edge Function's 10 limit
      });

      if (!nearbyPlaces?.length) {
        Alert.alert(
          "No destinations found",
          "Try again in a moment or adjust your location."
        );
        return;
      }

      log.info("[walkStart] Fetched buildings for route generation", {
        count: nearbyPlaces.length,
        targetDuration: time,
      });

      // Buildings from fetchNearbyBuildingsFromDB already have correct field names
      // (both lat/lng and latitude/longitude)
      const mappedBuildings = nearbyPlaces;

      // NEW: Build time-constrained route with aesthetic filtering
      let routeResult;
      try {
        // Fetch user style exposure for novelty calculation
        const userExposure = session?.user?.id
          ? await getUserStyleExposure(session.user.id)
          : undefined;

        // Build time-constrained route (use mapped buildings with correct field names)
        routeResult = await buildTimeConstrainedRoute({
          buildings: mappedBuildings,
          userLocation: location,
          userProfile: profile,
          targetDurationMin: time,
          userExposure,
        });

        log.info("[walkStart] Route built", {
          tier: routeResult.routeTier,
          buildingCount: routeResult.buildings.length,
          estimatedDuration: routeResult.estimatedDurationMin,
          xpMultiplier: routeResult.xpMultiplier,
        });

        // Show wildcard notification if exploration mode
        if (routeResult.routeTier === 'wildcard') {
          Alert.alert(
            "🎲 Exploration Mode",
            `No close aesthetic matches found. This walk will show you new styles with a ${routeResult.xpMultiplier}x XP bonus for exploration!`,
            [{ text: "Let's Go!", style: "default" }]
          );
        } else if (routeResult.routeTier === 'behavioral') {
          Alert.alert(
            "🔍 Discovery Mode",
            "Based on buildings similar to ones you've explored before. Keep scanning to improve your profile!",
            [{ text: "Let's Go!", style: "default" }]
          );
        }

        if (routeResult.buildings.length === 0) {
          Alert.alert(
            "No route found",
            `Couldn't find buildings within ${time} minutes. Try increasing the duration or adjusting your location.`
          );
          return;
        }
      } catch (routeError) {
        log.error("[walkStart] Error building route", routeError);
        // Fallback to unscored buildings if route building fails
        routeResult = {
          buildings: mappedBuildings.slice(0, 10),
          routeTier: 'aesthetic',
          xpMultiplier: 1.0,
          compatibilityScore: 50,
          estimatedDurationMin: time,
          totalDistanceKm: 1,
        };
      }


      // Create walk session with route tier metadata
      let walkSession;
      try {
        walkSession = await startWalk({
          userId: session.user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          routeTier: routeResult.routeTier,
          routeXpMultiplier: routeResult.xpMultiplier,
          compatibilityScore: routeResult.compatibilityScore,
          targetDurationMin: time,
          estimatedDurationMin: routeResult.estimatedDurationMin,
        });

        log.info('[walkStart] Walk session created', {
          walkId: walkSession.walkId,
          routeTier: routeResult.routeTier,
          xpMultiplier: routeResult.xpMultiplier,
        });
      } catch (walkError) {
        log.error('[walkStart] Failed to create walk session', walkError);
        Alert.alert(
          'Unable to start walk',
          'Failed to create walk session. Please try again.'
        );
        return;
      }

      pinToJink(false);
      navigation.navigate(screens.WalkNav, {
        walkId: walkSession.walkId,                    // NEW: Pass walk session ID
        places: routeResult.buildings,
        location,
        duration: time,
        xpMultiplier: routeResult.xpMultiplier,        // Pass XP multiplier for UI
        routeTier: routeResult.routeTier,              // Pass tier for UI badges
        estimatedDuration: routeResult.estimatedDurationMin,
        compatibilityScore: routeResult.compatibilityScore,
      });
    } catch (error) {
      log.error("[walkStart] Error fetching nearby places", error);
      Alert.alert(
        "Unable to start walk",
        "We couldn't generate a route. Please try again."
      );
    } finally {
      setIsFetching(false);
      if (hapticsCancelRef.current) {
        hapticsCancelRef.current();
        hapticsCancelRef.current = null;
      }
    }
  }, [isFetching, location, navigation, pinToJink, startLaunchHaptics, time, profile, session?.user?.id]);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.timerDisplay, { opacity: timerOpacity, transform: [{ translateY: timerTranslateY }] }]}>
          {xpBonus.multiplier > 1.0 && (
            <View style={styles.xpBonusContainer}>
              <XpBonusIndicator multiplier={xpBonus.multiplier} />
            </View>
          )}
          
          {/* Timer Display */}
          <TimerDisplay value={time} label="minutes" />
          
          {/* Time Stepper Buttons */}
          <TimeStepper 
            value={time} 
            onChange={setTime} 
            min={5} 
            max={95} 
            buttonSize={64}
            opacity={stepperOpacity}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sliderOrbWrapper,
            {
              opacity: sliderOpacity,
              transform: [{ scale: sliderScale }, { translateY: sliderTranslateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Orb rendered locally to ensure it is behind the slider */}
          <View style={styles.orbWrapper} pointerEvents="none">
            <ArchetypeOrb
              archetypeData={orbData}
              size={256}
              interactive={false}
              lod="standard"
              showGlow={true}
              glowOpacityMultiplier={0.05}
            />
          </View>

          {/* Reactor Glow behind slider */}
          <View style={styles.glowContainer} pointerEvents="none">
            <MultiplierGlow 
              color={xpBonus.multiplier > 1.0 ? xpBonus.color : null} 
              size={600} 
            />
          </View>
          <TimeSlider
            min={5}
            max={95}
            initialValue={time}
            setValue={setTime}
            onPress={handleStartWalk}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.instructionTextWrapper,
            { opacity: instructionOpacity, transform: [{ translateY: instructionTranslateY }] },
          ]}
        >
          <StreamingInstructionText
            text={isFetching ? "Generating your jink..." : "Press orb to start jink"}
            duration={2600}
            baseColor="#111"
            baseOpacity={isFetching ? 0.18 : 0.22}
            highlightColor="#fff"
            fontSize={16}
            letterSpacing={1}
            style={styles.instructionText}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DESIGNER_REPUBLIC_THEME.colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 56,
  },
  sliderOrbWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28, // Match JINK_OFFSET_Y
    zIndex: 100, // Ensure TimeSlider PNG is above orb
  },
  glowContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerDisplay: {
    position: "absolute",
    top: 100, // Moved down to make room for XP badge
    left: 0,
    right: 0,
    alignItems: "center",
    overflow: "visible", // Allow XP indicator to extend above
  },
  xpBonusContainer: {
    position: "absolute",
    top: -16, // Position above timer with clear spacing, but still visible
    marginBottom: 12,
    alignSelf: "center",
  },
  orbWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionTextWrapper: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#111",
  },
});

export default WalkStartScreen;
