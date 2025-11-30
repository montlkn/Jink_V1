/**
 * OrbGlow - Visible diffuse circular glow for the ArchetypeOrb
 */
import {
  BlurMask,
  Canvas,
  Circle,
  RadialGradient,
  vec
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { type ViewStyle } from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
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

// Soft Diffuse Glow - Optimized for performance and readability
const STATE_CONFIG = {
  default: {
    layer1Opacity: 0.4,  // Soft outer atmospheric
    layer2Opacity: 0.3,  // Mid diffuse
    layer3Opacity: 0.2,  // Inner highlight (soft)
  },
  hover: {
    layer1Opacity: 0.5,
    layer2Opacity: 0.4,
    layer3Opacity: 0.3,
  },
  press: {
    layer1Opacity: 0.6,
    layer2Opacity: 0.5,
    layer3Opacity: 0.4,
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

  // Slow, breathing pulse
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    pulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [pulseProgress]);

  useEffect(() => {
    const unsubscribe = subscribeToDeviceRotation(({ beta, gamma }) => {
      gyroX.value = withTiming(Math.max(-0.5, Math.min(0.5, gamma / 45)), { duration: 100 }); 
      gyroY.value = withTiming(Math.max(-0.5, Math.min(0.5, beta / 45)), { duration: 100 });
    });
    return unsubscribe;
  }, [gyroX, gyroY]);
  
  const orbRadius = size / 2;
  
  // Soft colors
  const glowColors = [
    colors[0],
    colors[1],
    `${colors[1]}00` // Transparent end
  ];

  // Subtle pulse
  const pulseOpacity = useDerivedValue(() => {
    return 0.8 + (pulseProgress.value * 0.2);
  });

  const layer1Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer1Opacity;
    return withTiming(baseOpacity * pulseOpacity.value, { duration: 500 });
  });

  const layer2Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer2Opacity;
    return withTiming(baseOpacity * pulseOpacity.value, { duration: 500 });
  });

  const layer3Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer3Opacity;
    return withTiming(baseOpacity * pulseOpacity.value, { duration: 500 });
  });

  // Large canvas for diffuse glow
  const canvasSize = size * 2.2;
  const center = canvasSize / 2;

  const c = useDerivedValue(() => {
    const offsetX = gyroY.value * 15;
    const offsetY = gyroX.value * 15;
    return vec(center + offsetX, center + offsetY);
  });

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize, position: 'absolute', top: -(canvasSize - size) / 2, left: -(canvasSize - size) / 2 }}>
      {/* Layer 1: Wide Atmospheric Glow */}
      <Circle cx={center} cy={center} r={orbRadius * 1.4} opacity={layer1Opacity}>
        <RadialGradient
          c={c}
          r={orbRadius * 1.4}
          colors={glowColors}
        />
        <BlurMask blur={60} style="normal" />
      </Circle>

      {/* Layer 2: Mid Diffuse Glow */}
      <Circle cx={center} cy={center} r={orbRadius * 1.2} opacity={layer2Opacity}>
        <RadialGradient
          c={c}
          r={orbRadius * 1.2}
          colors={glowColors}
        />
        <BlurMask blur={30} style="normal" />
      </Circle>

      {/* Layer 3: Soft Inner Highlight (No sharp edges) */}
      <Circle cx={center} cy={center} r={orbRadius * 1.05} opacity={layer3Opacity}>
        <RadialGradient
          c={c}
          r={orbRadius * 1.05}
          colors={glowColors}
        />
        <BlurMask blur={15} style="normal" />
      </Circle>
    </Canvas>
  );
}



export default OrbGlow;