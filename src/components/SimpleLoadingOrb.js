import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const DEFAULT_SIZE = Math.min(WINDOW_W * 0.56, 340);

export default function SimpleLoadingOrb({ size = DEFAULT_SIZE }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.8)).current;
  const opacity2 = useRef(new Animated.Value(0.6)).current;
  const opacity3 = useRef(new Animated.Value(0.9)).current;
  const opacity4 = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Rotation animation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Blob opacity animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity1, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity2, {
          toValue: 0.9,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 0.4,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity3, {
          toValue: 0.7,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity3, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity4, {
          toValue: 0.9,
          duration: 1900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity4, {
          toValue: 0.5,
          duration: 1900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.glassBg} />
      <Animated.View
        style={[
          styles.orbContainer,
          {
            transform: [{ rotate: spin }, { scale }],
          },
        ]}
      >
        {/* Blob 1 - Teal */}
        <Animated.View
          style={[
            styles.blob,
            styles.blob1,
            { opacity: opacity1, backgroundColor: 'rgba(5, 209, 230, 0.85)' },
          ]}
        />

        {/* Blob 2 - Magenta */}
        <Animated.View
          style={[
            styles.blob,
            styles.blob2,
            { opacity: opacity2, backgroundColor: 'rgba(245, 40, 158, 0.85)' },
          ]}
        />

        {/* Blob 3 - Green */}
        <Animated.View
          style={[
            styles.blob,
            styles.blob3,
            { opacity: opacity3, backgroundColor: 'rgba(56, 239, 153, 0.85)' },
          ]}
        />

        {/* Blob 4 - Blue */}
        <Animated.View
          style={[
            styles.blob,
            styles.blob4,
            { opacity: opacity4, backgroundColor: 'rgba(46, 46, 235, 0.85)' },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 9999,
  },
  orbContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  blob1: {
    width: "65%",
    height: "65%",
    top: "10%",
    left: "15%",
  },
  blob2: {
    width: "55%",
    height: "55%",
    bottom: "15%",
    right: "20%",
  },
  blob3: {
    width: "70%",
    height: "70%",
    top: "20%",
    right: "10%",
  },
  blob4: {
    width: "50%",
    height: "50%",
    bottom: "25%",
    left: "25%",
  },
});
