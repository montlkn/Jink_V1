/**
 * OrbGlow - Visible diffuse circular glow for the ArchetypeOrb
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  vec
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { subscribeToDeviceRotation } from "../three/orb/gyroController";

type GlowState = "default" | "hover" | "press";

type OrbGlowProps = {
  size: number;
  activeState?: GlowState;
  style?: ViewStyle;
  animationDuration?: number;
  colors?: [string, string];
};

// Reduced opacity values for subtle glow behind glass
const STATE_CONFIG = {
  default: {
    layer1Opacity: 0.15,  // Outer atmospheric
    layer2Opacity: 0.20,  // Mid glow
    layer3Opacity: 0.25,  // Edge highlight
  },
  hover: {
    layer1Opacity: 0.20,
    layer2Opacity: 0.25,
    layer3Opacity: 0.30,
  },
  press: {
    layer1Opacity: 0.30,
    layer2Opacity: 0.40,
    layer3Opacity: 0.50,
  },
};

export function OrbGlow({
  size,
  activeState = "default",
  style,
  animationDuration = 8,
  colors = ["#FFFFFF", "#FFFFFF"],
}: OrbGlowProps) {
  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = subscribeToDeviceRotation(({ beta, gamma }) => {
      // Beta is x-axis tilt (-180 to 180), Gamma is y-axis tilt (-90 to 90)
      // We want subtle movement, so we clamp and scale
      // Invert axes for natural "reflection" feel
      gyroX.value = withTiming(Math.max(-0.5, Math.min(0.5, gamma / 45)), { duration: 100 }); 
      gyroY.value = withTiming(Math.max(-0.5, Math.min(0.5, beta / 45)), { duration: 100 });
    });
    return unsubscribe;
  }, [gyroX, gyroY]);
  
  const orbRadius = size / 2;
  
  // Glow extends slightly beyond the orb
  const glowRadius = orbRadius * 0.85;
  
  // Canvas must be significantly larger than glow radius to accommodate the blur
  // otherwise we get hard clipped edges (square box effect)
  // 50px blur needs significant padding to avoid clipping
  const blurPadding = 250; 
  const canvasSize = (glowRadius + blurPadding) * 2;
  const center = canvasSize / 2;
  
  // Offset to center the canvas on the orb
  const offset = (canvasSize - size) / 2;

  const config = STATE_CONFIG[activeState];

  // Dynamic gradient based on passed colors
  // Fade to transparent version of the secondary color to avoid grey edges
  const glowColors = [
    colors[0], // Core color (Color A)
    colors[1], // Mid color (Color B)
    `${colors[1]}00` // Transparent edge (Color B with 0 opacity)
  ];

  // Dynamic center based on gyro
  // Max shift is 30% of radius
  const shiftAmount = orbRadius * 0.3;
  const dynamicCenter = useDerivedValue(() => {
    return vec(center + gyroX.value * shiftAmount, center + gyroY.value * shiftAmount);
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: canvasSize,
          height: canvasSize,
          marginLeft: -offset,
          marginTop: -offset,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Layer 1: Large outer glow */}
        <Group opacity={config.layer1Opacity}>
          <Circle cx={center} cy={center} r={glowRadius}>
            <RadialGradient c={dynamicCenter} r={glowRadius} colors={glowColors} />
            <BlurMask blur={50} style="normal" />
          </Circle>
        </Group>

        {/* Layer 2: Medium glow */}
        <Group opacity={config.layer2Opacity}>
          <Circle cx={center} cy={center} r={orbRadius * 1.25}>
            <RadialGradient c={dynamicCenter} r={orbRadius * 1.25} colors={glowColors} />
            <BlurMask blur={30} style="normal" />
          </Circle>
        </Group>

        {/* Layer 3: Tight edge glow */}
        <Group opacity={config.layer3Opacity}>
          <Circle cx={center} cy={center} r={orbRadius * 1.08}>
            <RadialGradient c={dynamicCenter} r={orbRadius * 1.08} colors={glowColors} />
            <BlurMask blur={15} style="normal" />
          </Circle>
        </Group>
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
  },
});

export default OrbGlow;