import ArchetypeOrb from "@/features/orb/ArchetypeOrb";
import { walksActions } from "@/features/walks";
import { log } from "@/lib/log";
import { screens } from "@/navigation/routes";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, SafeAreaView, StyleSheet, View } from "react-native";
import StreamingInstructionText from "../../components/walk/StreamingInstructionText";
import TimerDisplay from "../../components/walk/TimerDisplay";
import TimeSlider from "../../components/walk/TimeSlider";
import TimeStepper from "../../components/walk/TimeStepper";
import { useOrbTransition } from "../../state/orbTransitionContext";
import { DESIGNER_REPUBLIC_THEME } from "../../theme/designer_republic";

const WalkStartScreen = ({ navigation, route }) => {
  const { pinToJink, orbData } = useOrbTransition();
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
  const stepperTranslateY = useMemo(
    () =>
      entryProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0],
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
  const filters = route?.params?.filters;
  const hapticsCancelRef = useRef(null);

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

  // Removed pinToJink effect to prevent global overlay from showing the pinned orb.
  // We render it locally now to control z-index and glow style.

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
          return;
        }

        const {
          coords: { latitude, longitude },
        } = await Location.getCurrentPositionAsync({});
        setLocation({ latitude, longitude });
      } catch (error) {
        log.error("[walkStart] Unable to fetch location", error);
      }
    })();
  }, []);

  const handleStartWalk = useCallback(async () => {
    if (isFetching) return;

    try {
      setIsFetching(true);
      startLaunchHaptics();
      const nearbyPlaces = await walksActions.fetchNearbyBuildings({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 1000,
        filters,
      });

      if (!nearbyPlaces?.length) {
        Alert.alert(
          "No destinations found",
          "Try again in a moment or adjust your location."
        );
        return;
      }

      pinToJink(false);
      navigation.navigate(screens.WalkNav, {
        places: nearbyPlaces,
        location,
        duration: time,
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
  }, [filters, isFetching, location, navigation, pinToJink, startLaunchHaptics, time]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.timerDisplay, { opacity: timerOpacity, transform: [{ translateY: timerTranslateY }] }]}>
          <TimerDisplay value={time} label="minutes" />
        </Animated.View>
        <Animated.View style={[styles.stepperWrapper, { opacity: stepperOpacity, transform: [{ translateY: stepperTranslateY }] }]}>
          <TimeStepper value={time} onChange={setTime} min={5} max={90} />
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
          {/* Render Orb + Glow first (behind) so TimeSlider is on top */}
          <View style={styles.orbContainer} pointerEvents="none">
            <ArchetypeOrb
              archetypeData={orbData}
              size={220}
              interactive={false}
              lod="standard"
              showGlow={true} // Use optimized Skia glow
            />
          </View>

          <TimeSlider
            min={5}
            max={90}
            initialValue={time}
            setValue={setTime}
            onPress={handleStartWalk}
            showRangeLabels={false}
            centerLabel={null}
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
    </SafeAreaView>
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
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100, // Ensure TimeSlider PNG is above orb
  },
  timerDisplay: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  stepperWrapper: {
    position: "absolute",
    top: 180,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  orbWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionTextWrapper: {
    position: "absolute",
    bottom: 110,
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
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    // Rendered before TimeSlider in JSX, so it will be behind it naturally
  },
});

export default WalkStartScreen;
