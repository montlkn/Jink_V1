import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, SafeAreaView, StyleSheet, View } from "react-native";
import { getNearbyPlaces } from "../../api/buildingsApi.js";
import StreamingInstructionText from "../../components/walk/StreamingInstructionText";
import TimeSlider from "../../components/walk/TimeSlider";
import TimerDisplay from "../../components/walk/TimerDisplay";
import { useOrbTransition } from "../../state/orbTransitionContext";

const WalkStartScreen = ({ navigation }) => {
  const { orbData } = useOrbTransition();
  const entryScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [time, setTime] = useState(45);
  const [location, setLocation] = useState({
    latitude: 40.7128,
    longitude: -74.006,
  });
  const [isFetching, setIsFetching] = useState(false);
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
      entryScale.setValue(0.85);
      contentOpacity.setValue(0);
      Animated.spring(entryScale, {
        toValue: 1,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }).start();

      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        delay: 60,
        useNativeDriver: true,
      }).start();

      return () => {
        entryScale.stopAnimation();
        contentOpacity.stopAnimation();
      };
    }, [entryScale, contentOpacity])
  );

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
        console.error("Unable to fetch location", error);
      }
    })();
  }, []);

  const handleStartWalk = useCallback(async () => {
    if (isFetching) return;

    try {
      setIsFetching(true);
      startLaunchHaptics();
      const nearbyPlaces = await getNearbyPlaces(
        location.latitude,
        location.longitude,
        1000
      );

      if (!nearbyPlaces?.length) {
        Alert.alert(
          "No destinations found",
          "Try again in a moment or adjust your location."
        );
        return;
      }

      navigation.navigate("WalkNavScreen", {
        places: nearbyPlaces,
        location,
        duration: time,
      });
    } catch (error) {
      console.error("Error fetching nearby places:", error);
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
  }, [isFetching, location, navigation, time]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View style={[styles.timerDisplay, { opacity: contentOpacity }]}> 
          <TimerDisplay value={time} label="minutes" />
        </Animated.View>
        <Animated.View
          style={[styles.sliderOrbWrapper, { opacity: contentOpacity }]}
          pointerEvents="box-none"
        >
          <TimeSlider
            min={5}
            max={90}
            initialValue={time}
            setValue={setTime}
            onPress={handleStartWalk}
            showRangeLabels={false}
            centerLabel={null}
          />
          {/* Orb is rendered by global overlay and pinned while on Jink */}
        </Animated.View>
        <Animated.View style={[styles.instructionTextWrapper, { opacity: contentOpacity }]}> 
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
    backgroundColor: "#F8F8F8",
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
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  timerDisplay: {
    position: "absolute",
    top: 64,
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
});

export default WalkStartScreen;
