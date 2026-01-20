import { useAuth } from "@/auth/authProvider";
// eslint-disable-next-line no-restricted-imports
import XPStatusBanner from "@/components/passport/XPStatusBanner";
import { useAestheticProfile } from "@/hooks/useAestheticProfile";
import { useQuestsData } from "@/hooks/useQuestsData";
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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, LayoutAnimation, Platform, StyleSheet, Text, UIManager, View } from "react-native";
import { TactileButton } from "../../components/tactile/TactileButton";
import StreamingInstructionText from "../../components/walk/StreamingInstructionText";
import TimeSlider from "../../components/walk/TimeSlider";
import ArchetypeOrb from "../../features/orb/ArchetypeOrb";
import { useOrbTransition } from "../../state/orbTransitionContext";
import { DESIGNER_REPUBLIC_THEME } from "../../theme/designer_republic";
import { theme } from "@/theme/tokens";
import { getWalkDurationBonus } from "../../utils/walkXpBonus";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}


const WalkStartScreen = ({ navigation, route }) => {
  const { pinToJink, orbData, startHomeToJinkTransition } = useOrbTransition();
  const { profile } = useAestheticProfile();
  const questsData = useQuestsData();
  const { session } = useAuth();
  const [time, setTime] = useState(45);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [includeVisited, setIncludeVisited] = useState(false);
  const hapticsCancelRef = useRef(null);

  // Orb fade animation - keeps orb mounted, just fades opacity
  // Start at 1 so orb is visible on initial mount
  const orbOpacity = useRef(new Animated.Value(1)).current;

  // Start at 1 so content is visible immediately on mount (no flash of invisible content)
  const entryProgress = useRef(new Animated.Value(1)).current;

  // Track if this is the first mount
  const isFirstMount = useRef(true);
  
  // Performance tracking
  const screenMountTime = useRef(performance.now());
  
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
          {/* Header Row */}
          <View style={styles.headerRow}>
             <View style={styles.xpIndicatorWrapper}>
                <XPStatusBanner
                  currentXP={questsData.status === "ready" ? questsData.value.xp.xp : 0}
                  level={questsData.status === "ready" ? questsData.value.xp.level : 1}
                  xpForNextLevel={questsData.status === "ready" ? questsData.value.xp.xpForNextLevel : 100}
                  streakCount={0}
                  multiplier={xpBonus.multiplier > 1.0 ? xpBonus.multiplier : undefined}
                  multiplierColor={xpBonus.multiplier > 1.0 ? xpBonus.color : undefined}
                />
             </View>
             <TactileButton
                style={styles.mapButton}
                onPress={() => Alert.alert("Coming Soon", "Map view integration in progress.")}
                intensity={40}
             >
                <Ionicons name="map-outline" size={24} color={theme.colors.black} />
             </TactileButton>
          </View>

          {/* Center Controls: Stepper + Slider + Orb */}
          <View style={styles.centerControls}>
             {/* Stepper Buttons */}
             <View style={styles.stepperRow}>
                <TactileButton 
                  onPress={() => adjustTime(-1)} 
                  style={styles.stepperButton}
                  intensity={20}
                >
                   <Text style={styles.stepperText}>-</Text>
                </TactileButton>

                <TactileButton 
                  onPress={() => adjustTime(1)} 
                  style={styles.stepperButton}
                  intensity={20}
                >
                   <Text style={styles.stepperText}>+</Text>
                </TactileButton>
             </View>

             {/* Slider Area - TimeSlider is the interactive base layer */}
             <View style={styles.sliderContainer}>
                {/* Interactive Slider - FIRST so it's at the bottom of the z-stack */}
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

                {/* Visual Layer: Orb + Text - ON TOP but non-interactive */}
                <View style={styles.centerVisuals} pointerEvents="none">
                   {/* Orb Underlay */}
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

                   {/* Huge Time Text Overlay */}
                   <Text style={[styles.bigTimeText, { color: xpBonus.color }]}>{time}</Text>
                </View>
             </View>
          </View>

          
          {/* Footer Controls: Toggles + Instruction */}
          <View style={styles.footerControls}>
             <View style={styles.toggleRow}>
               <TactileButton 
                  onPress={() => setIncludeVisited(true)} 
                  style={[styles.toggleButton, includeVisited && styles.toggleActive]}
                  intensity={includeVisited ? 60 : 30}
               >
                  <Text style={[styles.toggleText, includeVisited && styles.toggleTextActive]}>Some Old</Text>
               </TactileButton>

               <TactileButton 
                  onPress={() => setIncludeVisited(false)} 
                  style={[styles.toggleButton, !includeVisited && styles.toggleActive]}
                  intensity={!includeVisited ? 60 : 30}
               >
                  <Text style={[styles.toggleText, !includeVisited && styles.toggleTextActive]}>All New</Text>
               </TactileButton>
             </View>

             <StreamingInstructionText
                text={isFetching ? "Generating your jink..." : locationLoading ? "Acquiring location..." : "Press orb to start jink"}
                duration={2600}
                baseColor={theme.colors.text}
                baseOpacity={isFetching ? 0.18 : 0.22}
                highlightColor={theme.colors.white}
                fontSize={14}
                letterSpacing={1.5}
                style={styles.instructionText}
             />
          </View>

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
  },
  uiLayer: {
    flex: 1,
    width: '100%',
    paddingTop: 60,
    justifyContent: 'space-between',
    paddingBottom: 0, // Footer handles its own spacing
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  xpIndicatorWrapper: {
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  mapButton: {
    width: 50,
    height: 50,
    top: 12,
    borderRadius: 16, // Squircle-ish
  },
  
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 20,
    zIndex: 20,
  },
  stepperButton: {
    width: 90,
    height: 50,
    borderRadius: 25,
    // Enhanced recessed look
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.25)',
    borderLeftColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomColor: 'rgba(255, 255, 255, 0.6)',
    borderRightColor: 'rgba(255, 255, 255, 0.4)',
  },
  stepperText: {
    fontSize: 24,
    fontWeight: '300',
    color: theme.colors.text,
  },
  
  sliderContainer: {
    width: 370, // Match TimeSlider HIT_AREA_SIZE (290 + 40*2 = 370)
    height: 370,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderWrapper: {
    // The slider handles its own hit area sizing
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerVisuals: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  bigTimeText: {
    fontSize: 45,
    fontWeight: '800',
    top: -110,
    // Centered in the visual container (on top of orb)
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  footerControls: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 120, // Space to clear bottom tab bar
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  toggleButton: {
    width: 140,
    height: 50,
    borderRadius: 25,
  },
  toggleActive: {
    borderWidth: 1,
    borderColor: theme.colors.white,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: theme.colors.text,
  },
  instructionText: {
    marginTop: 8,
  },
});

export default WalkStartScreen;
