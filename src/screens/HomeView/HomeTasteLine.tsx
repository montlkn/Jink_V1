import { showtime } from "@/config/glowConfig";
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
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Glow from "react-native-animated-glow";
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
  const [glowState, setGlowState] = useState<"default" | "hover" | "press">("default");

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
    setGlowState("press");
    setTimeout(() => setGlowState("default"), 1000);

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

  // Shine animation
  const progress = useSharedValue(0);

  useEffect(() => {
    if (dimensions.width > 0) {
      progress.value = 0;
      progress.value = withDelay(
        800,
        withRepeat(
          withTiming(1, {
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
          }),
          -1,
          true
        )
      );
    }
    return () => cancelAnimation(progress);
  }, [dimensions.width, progress]);

  const leftBeamStyle = useAnimatedStyle(() => {
    const centerX = dimensions.width / 2;
    const edgeX = -60;
    const translateX = interpolate(progress.value, [0, 1], [centerX - 40, edgeX]);
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.5, 0.85, 1],
      [0.1, 0.35, 0.5, 0.35, 0.15]
    );
    return {
      transform: [{ translateX }, { skewX: "-12deg" }],
      opacity,
    };
  });

  const rightBeamStyle = useAnimatedStyle(() => {
    const centerX = dimensions.width / 2;
    const edgeX = dimensions.width + 10;
    const translateX = interpolate(progress.value, [0, 1], [centerX - 40, edgeX]);
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.5, 0.85, 1],
      [0.1, 0.35, 0.5, 0.35, 0.15]
    );
    return {
      transform: [{ translateX }, { skewX: "12deg" }],
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
    <Glow
      activeState={glowState}
      states={showtime.states as any}
      style={[styles.container]}
    >
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        onLayout={onLayout}
        accessibilityRole="button"
        accessibilityLabel={`Start walk: ${headline}`}
        hitSlop={8}
      >
        <View style={styles.content}>
          <View style={styles.copyWrapper}>
            <View style={styles.badge}>
              <Text style={styles.label}>We've noticed</Text>
            </View>
            <Text style={styles.headline}>{finalHeadline}</Text>
          </View>
          <Text style={styles.arrow} accessibilityElementsHidden>
            {"›"}
          </Text>
        </View>

        <View style={styles.shineContainer} pointerEvents="none">
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
    </Glow>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: "100%",
    overflow: "visible",
  },
  pressable: {
    backgroundColor: "#000000",
    borderRadius: 12,
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
    borderRadius: 12,
    overflow: "hidden",
  },
  shineBeam: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: 80,
  },
});