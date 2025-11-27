import { useOrbTransition } from "@/features/home";
import {
  DEFAULT_TASTE_ACTION,
  type TasteAction,
} from "@/features/home/tasteActions";
import { screens, type RootParams } from "@/navigation/routes";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  action?: TasteAction | null;
};

const buildFallbackHeadline = (
  action: TasteAction | null | undefined
): string => {
  const central = action?.central ?? DEFAULT_TASTE_ACTION.central;
  const label =
    typeof central?.label === "string" && central.label.trim().length
      ? central.label.trim()
      : DEFAULT_TASTE_ACTION.central.label;

  switch (central?.kind) {
    case "architect":
      return `Explore work by ${label}`;
    case "era":
      return `Explore ${label}`;
    case "style":
    default:
      return `Try ${label} nearby`;
  }
};

export default function HomeTasteLine({ action }: Props): JSX.Element {
  const navigation = useNavigation<NavigationProp<RootParams>>();
  const { startHomeToJinkTransition, pinToJink } = useOrbTransition();
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const resolved =
    action &&
    typeof action.headline === "string" &&
    action.headline.trim().length
      ? action
      : DEFAULT_TASTE_ACTION;
  const trimmedHeadline =
    typeof resolved.headline === "string" ? resolved.headline.trim() : "";
  const fallbackHeadline = buildFallbackHeadline(resolved);
  const headline = trimmedHeadline.length
    ? trimmedHeadline
    : fallbackHeadline.length
    ? fallbackHeadline
    : "No recent taste yet — complete a scan or quiz.";
  const finalHeadline =
    headline.trim().length > 0
      ? headline.trim()
      : "No recent taste yet — complete a scan or quiz.";
  const filters = resolved.filters ?? DEFAULT_TASTE_ACTION.filters;

  const handlePress = () => {
    startHomeToJinkTransition()
      .catch(() => false)
      .then((completed) => {
        navigation.navigate(screens.Main, {
          screen: screens.WalkStart,
          params: filters ? { filters } : undefined,
        });
        if (completed) {
          pinToJink(true);
        }
      });
  };

  // --- Smooth Ebbing Shine Animation ---
  // Uses withRepeat with reverse=true for natural back-and-forth
  // Progress: 0 = beams at center, 1 = beams at edges
  const progress = useSharedValue(0);

  useEffect(() => {
    if (dimensions.width > 0) {
      progress.value = 0;
      
      // Smooth sine-like easing for organic feel
      progress.value = withDelay(
        800,
        withRepeat(
          withTiming(1, {
            duration: 3000, // Slow, meditative expansion
            easing: Easing.inOut(Easing.sin), // Sine easing = natural ebb and flow
          }),
          -1,
          true // REVERSE = true - this makes it smoothly return
        )
      );
    }
    return () => cancelAnimation(progress);
  }, [dimensions.width, progress]);

  // Left beam - moves from center to left edge and back
  const leftBeamStyle = useAnimatedStyle(() => {
    const centerX = dimensions.width / 2;
    const edgeX = -60; // Off the left edge
    
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [centerX - 40, edgeX]
    );
    
    // Opacity peaks in the middle of travel, softer at center and edges
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.5, 0.85, 1],
      [0.1, 0.35, 0.5, 0.35, 0.15]
    );
    
    return {
      transform: [
        { translateX },
        { skewX: "-12deg" },
      ],
      opacity,
    };
  });

  // Right beam - moves from center to right edge and back
  const rightBeamStyle = useAnimatedStyle(() => {
    const centerX = dimensions.width / 2;
    const edgeX = dimensions.width + 10; // Off the right edge
    
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [centerX - 40, edgeX]
    );
    
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.5, 0.85, 1],
      [0.1, 0.35, 0.5, 0.35, 0.15]
    );
    
    return {
      transform: [
        { translateX },
        { skewX: "12deg" },
      ],
      opacity,
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setDimensions({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={`Start walk: ${headline}`}
      hitSlop={8}
    >
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.copyWrapper}>
          <View style={styles.badge}>
            <Text style={styles.label}>Recent taste</Text>
          </View>
          <Text style={styles.headline}>{finalHeadline}</Text>
        </View>
        <Text style={styles.arrow} accessibilityElementsHidden>
          {"\u203A"}
        </Text>
      </View>

      {/* Shine overlay - two beams that ebb from center to edges */}
      <View style={styles.shineContainer} pointerEvents="none">
        {/* Left beam */}
        <Animated.View style={[styles.shineBeam, leftBeamStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.4)",
              "rgba(255,255,255,0.15)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        
        {/* Right beam */}
        <Animated.View style={[styles.shineBeam, rightBeamStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.4)",
              "rgba(255,255,255,0.15)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#000000",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  copyWrapper: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 22,
    flexWrap: "wrap",
  },
  arrow: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  shineContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shineBeam: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: 80,
  },
});