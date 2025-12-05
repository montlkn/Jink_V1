import { useAuth } from "@/auth/authProvider";
import { useAestheticProfile } from "@/hooks/useAestheticProfile";
import { log } from "@/lib/log";
import { screens } from "@/navigation/routes";
// eslint-disable-next-line no-restricted-imports
import { getUserStyleExposure } from '@/services/gateways/userBehaviorGateway';
// eslint-disable-next-line no-restricted-imports
import { buildTimeConstrainedRoute } from '@/services/routeBuilderService';
// eslint-disable-next-line no-restricted-imports
import { fetchNearbyBuildingsFromDB } from '@/services/buildingService';
// eslint-disable-next-line no-restricted-imports
import { startWalk } from '@/services/gateways';
// eslint-disable-next-line no-restricted-imports
import { getCachedLocation } from "@/services/locationCacheService";
import { fetchUserScannedBuildings, filterVisitedBuildings } from '@/utils/visitedBuildingsUtils';
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { FilterMenu } from "../../components/common/FilterMenu";
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
  const { pinToJink, orbData, startHomeToJinkTransition } = useOrbTransition();
  const { profile } = useAestheticProfile();
  const { session } = useAuth();
  const [time, setTime] = useState(45);
  const [location, setLocation] = useState(null); // Start null to indicate loading
  const [locationLoading, setLocationLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [shouldRenderOrb, setShouldRenderOrb] = useState(false); // Defer 3D rendering for performance
  const [includeVisited, setIncludeVisited] = useState(false); // Toggle for including previously visited buildings
  const [showFilterMenu, setShowFilterMenu] = useState(false); // Show/hide filter menu
  const hapticsCancelRef = useRef(null);


  // Start at 0.5 so content is visible immediately on mount (no flash of invisible content)
  const entryProgress = useRef(new Animated.Value(0.5)).current;
  
  // Performance tracking
  const screenMountTime = useRef(performance.now());
  
  useEffect(() => {
    const mountEnd = performance.now();
    log.info('[WalkStart] Screen mounted', {
      mountTime: `${(mountEnd - screenMountTime.current).toFixed(1)}ms`
    });
  }, []);

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
        inputRange: [0, 0.6, 1],
        outputRange: [0.7, 0.9, 1],  // Start at 70% opacity - visible immediately
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const sliderOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.85, 1],  // Start at 60% opacity - visible immediately
        extrapolate: "clamp",
      }),
    [entryProgress]
  );
  const instructionOpacity = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [0.5, 0.75, 1],  // Start at 50% opacity - visible immediately
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
      const focusStart = performance.now();
      log.info('[WalkStart] Screen focused, starting animation');
      
      entryProgress.stopAnimation();
      entryProgress.setValue(0.5);  // Start at 50% - content visible immediately!

      const animation = Animated.timing(entryProgress, {
        toValue: 1,
        duration: 150,  // Reduced to 150ms for sub-250ms total time
        useNativeDriver: true,
      });

      animation.start(() => {
        const animEnd = performance.now();
        log.info('[WalkStart] Animation complete', {
          totalTime: `${(animEnd - focusStart).toFixed(1)}ms`
        });
        // Defer orb rendering until after animation for performance
        setShouldRenderOrb(true);
      });

      return () => {
        animation.stop();
        entryProgress.stopAnimation();
        setShouldRenderOrb(false); // Clean up on unmount
      };
    }, [entryProgress])
  );

  useFocusEffect(
    useCallback(() => {
      // Trigger the Home → WalkStart transition animation
      startHomeToJinkTransition().then((success) => {
        if (success) {
          // Pin the orb after transition completes
          pinToJink(true);
        } else {
          // If no transition (e.g., no home layout registered), just pin directly
          pinToJink(true);
        }
      });

      return () => {
        // Unpin when leaving WalkStart
        pinToJink(false);
      };
    }, [pinToJink, startHomeToJinkTransition])
  );

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        log.info("[walkStart] Fetching location from cache...");
        
        // First, try to get cached location (pre-warmed at app startup)
        const cachedLoc = await getCachedLocation({ maxAge: 60000 }); // 60 second max age
        
        if (cachedLoc) {
          setLocation({ latitude: cachedLoc.latitude, longitude: cachedLoc.longitude });
          setLocationLoading(false);
          log.info("[walkStart] Location acquired from cache", { 
            latitude: cachedLoc.latitude, 
            longitude: cachedLoc.longitude,
            accuracy: cachedLoc.accuracy 
          });
          return;
        }

        // Fallback: If no cached location, request permissions and fetch fresh
        log.info("[walkStart] No cached location, requesting permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Location Required",
            "This app needs location access to find nearby buildings. Please enable location in Settings.",
            [{ text: "OK" }]
          );
          return;
        }

        log.info("[walkStart] Fetching fresh location...");
        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Use Balanced for faster acquisition
        });

        const { latitude, longitude } = locationData.coords;
        setLocation({ latitude, longitude });
        setLocationLoading(false);
        log.info("[walkStart] Fresh location acquired", { latitude, longitude });
      } catch (error) {
        log.error("[walkStart] Location error:", {
          message: error.message,
          code: error.code,
        });
        
        Alert.alert(
          "Location Error",
          "Unable to get your location. Please check that Location Services are enabled.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: fetchLocation }
          ]
        );
      }
    };

    fetchLocation();
  }, []);

  const handleFilterPress = useCallback(() => {
    setShowFilterMenu(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFilterSelect = useCallback((value) => {
    setIncludeVisited(value);
  }, []);

  const handleStartWalk = useCallback(async () => {
    if (isFetching) return;
    
    // Block start if location not yet acquired
    if (!location) {
      Alert.alert(
        "Acquiring Location",
        "Please wait while we get your location. This should only take a few seconds."
      );
      return;
    }

    try {
      setIsFetching(true);
      startLaunchHaptics();

      // NEW: Query Buildings DB directly with dynamic radius based on walk duration
      // Walking speed: ~4.5 km/h, so a 30-min walk covers ~2.25 km
      // Use 80% of theoretical max distance for better building variety
      const WALKING_SPEED_KMH = 4.5;
      const walkRadiusKm = Math.max(
        0.6, // Minimum 600m radius (ensures good variety even for short walks)
        Math.min(
          3.0, // Maximum 3km radius (allows long walks to have more options)
          (time / 60) * WALKING_SPEED_KMH * 0.8 // 80% of theoretical distance
        )
      );

      log.info("[walkStart] Fetching nearby buildings from Buildings DB", {
        location,
        targetDuration: time,
        searchRadius: `${walkRadiusKm.toFixed(2)}km`,
      });

      const nearbyPlaces = await fetchNearbyBuildingsFromDB({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: walkRadiusKm,
        limit: 150, // Generous limit for route variety
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
      let mappedBuildings = nearbyPlaces;

      // Filter out previously visited buildings if toggle is off
      if (!includeVisited && session?.user?.id) {
        try {
          const scannedIds = await fetchUserScannedBuildings(session.user.id);
          const beforeCount = mappedBuildings.length;
          mappedBuildings = filterVisitedBuildings(mappedBuildings, scannedIds);
          const afterCount = mappedBuildings.length;
          
          log.info('[walkStart] Filtered out visited buildings', {
            beforeCount,
            afterCount,
            filteredOut: beforeCount - afterCount,
          });

          // If filtering removed all buildings, alert user
          if (afterCount === 0 && beforeCount > 0) {
            Alert.alert(
              "All Buildings Visited!",
              "You've already visited all nearby buildings! Turn on 'Include Visited Buildings' to revisit them.",
              [{ text: "OK" }]
            );
            return;
          }
        } catch (error) {
          log.warn('[walkStart] Error filtering visited buildings, continuing with all buildings', error);
          // Continue with all buildings if filtering fails
        }
      }

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
      } catch (_routeError) {
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
        routeData: routeResult.route,                  // Pass OSRM route data for directions
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
  }, [isFetching, location, navigation, pinToJink, startLaunchHaptics, time, profile, session?.user?.id, includeVisited]);

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
          <TimerDisplay value={time} />
          
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
        
        {/* Filter Button - Top Right */}
        <Pressable 
          style={styles.filterButton}
          onPress={handleFilterPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.filterIcon}>{includeVisited ? "⊙" : "◎"}</Text>
        </Pressable>

        {/* Filter Menu */}
        <FilterMenu
          visible={showFilterMenu}
          onClose={() => setShowFilterMenu(false)}
          title="Filter Options"
          options={[
            { label: "Include Visited Buildings", value: true },
            { label: "Exclude Visited Buildings", value: false },
          ]}
          selectedValue={includeVisited}
          onSelect={handleFilterSelect}
        />
        
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

          {/* Local orb under slider - only render after screen animation */}
          <View style={styles.orbWrapper} pointerEvents="none">
            {shouldRenderOrb && (
              <ArchetypeOrb
                archetypeData={orbData}
                size={256}
                interactive={false}
                lod="standard"
                showGlow={true}
                glowOpacityMultiplier={0.05}
              />
            )}
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
            text={isFetching ? "Generating your jink..." : locationLoading ? "Acquiring location..." : "Press orb to start jink"}
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
    backgroundColor: DESIGNER_REPUBLIC_THEME.colors.background,  // Match theme, not white
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
    top: 120, // Moved down to make room for XP badge
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
  filterButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterIcon: {
    fontSize: 24,
    color: '#111',
    fontWeight: '600',
  },
});

export default WalkStartScreen;
