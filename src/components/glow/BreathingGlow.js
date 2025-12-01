import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * BreathingGlow Component
 * Renders a radial gradient glow with breathing animation
 * 
 * @param {string} color - The color of the glow (default: white)
 * @param {number} size - The size of the glow in pixels (default: 200)
 * @param {number} duration - Duration of one breath cycle in ms (default: 2000)
 * @param {number} minOpacity - Minimum opacity during breathing (default: 0.3)
 * @param {number} maxOpacity - Maximum opacity during breathing (default: 0.6)
 * @param {number} minScale - Minimum scale during breathing (default: 0.85)
 * @param {number} maxScale - Maximum scale during breathing (default: 1.15)
 */
const BreathingGlow = ({ 
  color = "#ffffff90", 
  size = 200, 
  duration = 2000,
  minOpacity = 0.5,
  maxOpacity = 1.0,
  minScale = 0.85,
  maxScale = 1.15,
}) => {
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create breathing animation loop
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, [breatheAnim, duration]);

  const scale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [minScale, maxScale],
  });

  const opacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [minOpacity, maxOpacity],
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
            id={`breathingGrad-${color.replace('#', '')}`}
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
        <Rect x="0" y="0" width="100" height="100" fill={`url(#breathingGrad-${color.replace('#', '')})`} />
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
    pointerEvents: "none", // Allow touches to pass through to elements below
  },
});

export default BreathingGlow;
