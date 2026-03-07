import { useAuth } from "@/auth/authProvider";
// eslint-disable-next-line no-restricted-imports
import XPStatusBanner from "@/components/passport/XPStatusBanner";
import { useAestheticProfile } from "@/hooks/useAestheticProfile";
import { log } from "@/lib/log";
// eslint-disable-next-line no-restricted-imports
import { getProgressToNextLevel } from "@/constants/xpLevels";
import { screens } from "@/navigation/routes";
import { fetchXpSummary } from "@/services/gateways";
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
// eslint-disable-next-line no-restricted-imports
import { preCacheWalkBuildings } from "@/services/gpsGridCacheService";
import { theme } from "@/theme/tokens";
import { fetchUserScannedBuildings, filterVisitedBuildings } from '@/utils/visitedBuildingsUtils';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { GeneralOnboardingModal } from "../../components/modals/GeneralOnboardingModal";
import XPGlassOrb from "../../components/three/orb/XPGlassOrb";
import StreamingInstructionText from "../../components/walk/StreamingInstructionText";
import TimeSlider from "../../components/walk/TimeSlider";
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
  const [xpData, setXpData] = useState({ xp: 0, level: 1, xpForNextLevel: 100 });
  const { session } = useAuth();
  const [time, setTime] = useState(5);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [includeVisited, setIncludeVisited] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const hapticsCancelRef = useRef(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem('@onboarding_seen');
      if (!seen) {
        setOnboardingVisible(true);
      }
    };
    checkOnboarding();
  }, []);

  const closeOnboarding = async () => {
    setOnboardingVisible(false);
    await AsyncStorage.setItem('@onboarding_seen', 'true');
  };

  // Orb fade animation - keeps orb mounted, just fades opacity
  // Start at 1 so orb is visible on initial mount
  const orbOpacity = useRef(new Animated.Value(1)).current;

  // Toggle animation for NEW/ALL underline selector
  const toggleFade = useRef(new Animated.Value(1)).current;
  const underlineAnim = useRef(new Animated.Value(includeVisited ? 1 : 0)).current;

  const handleToggleVisited = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(toggleFade, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(toggleFade, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]),
      Animated.timing(underlineAnim, {
        toValue: includeVisited ? 0 : 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    setIncludeVisited(prev => !prev);
  }, [toggleFade, underlineAnim, includeVisited]);

  // Start at 1 so content is visible immediately on mount (no flash of invisible content)
  const entryProgress = useRef(new Animated.Value(1)).current;

  // Track if this is the first mount
  const isFirstMount = useRef(true);

  // Performance tracking
  const screenMountTime = useRef(performance.now());

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchXpSummary(session.user.id)
      .then((xpSummary) => {
        const progress = getProgressToNextLevel(xpSummary.xp);
        setXpData({
          xp: xpSummary.xp,
          level: xpSummary.level,
          xpForNextLevel: progress.xpNeededForNext ?? 100,
        });
      })
      .catch((error) => {
        log.warn('[WalkStart] Failed to fetch XP data', error);
      });
  }, [session?.user?.id]);

  useEffect(() => {
    const mountEnd = performance.now();
    log.info('[WalkStart] Screen mounted', {
      mountTime: `${(mountEnd - screenMountTime.current).toFixed(1)}ms`
    });
  }, []);

  // OPTIMIZED: Single useMemo for all entry animations instead of 8 separate ones
  const entryAnimations = useMemo(() => ({
    uiOpacity: entryProgress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 1, 1],
      extrapolate: "clamp",
    }),
    uiTranslateY: entryProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
      extrapolate: "clamp",
    }),
  }), [entryProgress]);


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
      log.info('[WalkStart] Screen focused, starting animations', { isFirstMount: isFirstMount.current });

      // On first mount, everything is already visible (values start at 1)
      // Only animate on subsequent navigations back to this screen
      if (isFirstMount.current) {
        isFirstMount.current = false;
        // Already visible, nothing to animate
        return () => {
          // Fade out orb when leaving
          Animated.timing(orbOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        };
      }

      // Re-navigation: Reset and animate in
      entryProgress.stopAnimation();
      entryProgress.setValue(0.5);
      orbOpacity.stopAnimation();
      orbOpacity.setValue(0);

      // Parallel animations: entry progress + orb fade in
      Animated.parallel([
        Animated.timing(entryProgress, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        // Fade out orb when leaving (don't unmount)
        Animated.timing(orbOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      };
    }, [entryProgress, orbOpacity])
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
        searchRadius: `${walkRadiusKm.toFixed(2)}km`,
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

      // Pre-cache walk buildings for instant scan lookups
      try {
        await preCacheWalkBuildings(routeResult.buildings);
        log.info('[walkStart] Pre-cached walk buildings for fast scanning');
      } catch (cacheError) {
        log.warn('[walkStart] Failed to pre-cache walk buildings, continuing anyway', cacheError);
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


  // Helper for Stepper
  const adjustTime = (delta) => {
    setTime(prev => {
      const newVal = prev + delta;
      return Math.min(95, Math.max(5, newVal));
    });
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.uiLayer,
            { opacity: entryAnimations.uiOpacity, transform: [{ translateY: entryAnimations.uiTranslateY }] }
          ]}
          pointerEvents="box-none"
        >
          {/* Header Row: XP banner · · · Map button */}
          <View style={styles.headerRow}>
            <XPStatusBanner
              currentXP={xpData.xp}
              level={xpData.level}
              xpForNextLevel={xpData.xpForNextLevel}
              streakCount={0}
              multiplier={xpBonus.multiplier > 1.0 ? xpBonus.multiplier : undefined}
              multiplierColor={xpBonus.multiplier > 1.0 ? xpBonus.color : undefined}
            />
            <View style={styles.mapOrb}>
              <Pressable onPress={() => navigation.navigate(screens.StyleMap)} style={styles.mapOrbPressable}>
                <View style={styles.mapOrbCanvas} pointerEvents="none">
                  <XPGlassOrb size={80} level={1} progress={0} />
                </View>
                <View style={styles.mapOrbContent} pointerEvents="none">
                  <Ionicons name="map-outline" size={24} color={theme.colors.black} style={{ opacity: 0.55 }} />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Center: time + steppers + slider + orb */}
          <View style={styles.centerControls}>
            {/* Time number with flanking steppers */}
            <View style={styles.timeRow}>
              <Pressable
                onPress={() => adjustTime(-1)}
                hitSlop={20}
                style={({ pressed }) => [styles.stepperPressable, pressed && styles.stepperPressed]}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>

              <Text style={[styles.bigTimeText, { color: xpBonus.color }]}>{time}</Text>

              <Pressable
                onPress={() => adjustTime(1)}
                hitSlop={20}
                style={({ pressed }) => [styles.stepperPressable, pressed && styles.stepperPressed]}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>

            {/* Slider + Orb */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderWrapper}>
                <TimeSlider
                  min={5}
                  max={95}
                  initialValue={time}
                  setValue={setTime}
                  onPress={handleStartWalk}
                  color={xpBonus.color}
                />
              </View>
              <View style={styles.centerVisuals} pointerEvents="none">
                <Animated.View style={[styles.orbWrapper, { opacity: orbOpacity }]}>
                  <ArchetypeOrb
                    archetypeData={orbData}
                    size={190}
                    interactive={false}
                    lod="low"
                    showGlow={false}
                    glowOpacityMultiplier={0.05}
                  />
                </Animated.View>
              </View>
            </View>
          </View>

          {/* Footer: instruction + toggle */}
          <View style={styles.footerControls}>
            <StreamingInstructionText
              text={isFetching ? "Generating your jink..." : locationLoading ? "Acquiring location..." : "Press orb to start jink"}
              duration={2600}
              baseColor={theme.colors.text}
              baseOpacity={isFetching ? 0.18 : 0.25}
              highlightColor={theme.colors.white}
              fontSize={15}
              letterSpacing={2}
            />
            <Pressable onPress={handleToggleVisited} hitSlop={14} style={styles.togglePressable}>
              <Animated.View style={[styles.toggleRow, { opacity: toggleFade }]}>
                <View style={styles.toggleOption}>
                  <Text style={[styles.toggleOptionText, !includeVisited && styles.toggleOptionActive]}>NEW</Text>
                </View>
                <View style={styles.toggleSeparator} />
                <View style={styles.toggleOption}>
                  <Text style={[styles.toggleOptionText, includeVisited && styles.toggleOptionActive]}>ALL</Text>
                </View>
              </Animated.View>

              <View style={styles.toggleTrack}>
                <Animated.View
                  style={[styles.toggleIndicator, {
                    transform: [{
                      translateX: underlineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 48],
                      }),
                    }],
                  }]}
                />
              </View>
            </Pressable>
          </View>

        </Animated.View>
      </View>
      <GeneralOnboardingModal
        visible={onboardingVisible}
        onClose={closeOnboarding}
      />
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
  },
  uiLayer: {
    flex: 1,
    width: '100%',
    paddingTop: 60,
    justifyContent: 'space-between',
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  mapOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  mapOrbPressable: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOrbCanvas: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  mapOrbContent: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
    zIndex: 20,
  },
  bigTimeText: {
    fontSize: 88,
    fontWeight: '800',
    letterSpacing: -4,
    lineHeight: 88,
    width: 120,
    textAlign: 'center',
  },
  stepperPressable: {
    width: 52,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: {
    opacity: 0.25,
  },
  stepperText: {
    fontSize: 44,
    fontWeight: '200',
    color: theme.colors.text,
    lineHeight: 48,
    opacity: 0.5,
  },

  sliderContainer: {
    width: 370,
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sliderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerVisuals: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerControls: {
    alignItems: 'center',
    gap: 22,
    paddingBottom: 130,
  },
  togglePressable: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleOption: {
    width: 46,
    alignItems: 'center',
    paddingBottom: 6,
  },
  toggleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: theme.colors.text,
    opacity: 0.32,
  },
  toggleOptionActive: {
    opacity: 0.9,
    fontWeight: '700',
  },
  toggleSeparator: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.text,
    opacity: 0.18,
    marginHorizontal: 2,
  },
  toggleTrack: {
    width: 96,
    height: 2,
    backgroundColor: theme.colors.text,
    opacity: 0.12,
  },
  toggleIndicator: {
    width: 48,
    height: 2,
    backgroundColor: theme.colors.text,
    opacity: 0.85,
  },
});

export default WalkStartScreen;
