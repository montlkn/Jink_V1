import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * MultiplierGlow Component
 * Renders a radial gradient glow behind the TimeSlider with breathing animation
 */
const MultiplierGlow = ({ color, size = 600 }) => {
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!color) return;

    // Create breathing animation loop
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, [color, breatheAnim]);

  if (!color) return null;

  const scale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.2],
  });

  const opacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size,
          transform: [{ scale }],
          opacity,
        }
      ]}
    >
      <Svg height="100%" width="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient
            id="grad"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="1.0" />
            <Stop offset="15%" stopColor={color} stopOpacity="0.9" />
            <Stop offset="25%" stopColor={color} stopOpacity="0.7" />
            <Stop offset="40%" stopColor={color} stopOpacity="0.5" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="70%" stopColor={color} stopOpacity="0.15" />
            <Stop offset="85%" stopColor={color} stopOpacity="0.05" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#grad)" />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1, // Ensure it sits behind content
  },
});

export default MultiplierGlow;
