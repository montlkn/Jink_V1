/**
 * OrbGlow - Visible diffuse circular glow for the ArchetypeOrb
 */
import {
  BlurMask,
  Canvas,
  Circle
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
  opacityMultiplier?: number;
};

// Much Brighter Glow - Significantly increased opacity
const STATE_CONFIG = {
  default: {
    layer1Opacity: 0.8,  // Much brighter outer atmospheric
    layer2Opacity: 0.95,  // Very bright mid glow
    layer3Opacity: 1.0,  // Full edge glow
  },
  hover: {
    layer1Opacity: 0.7,
    layer2Opacity: 0.9,
    layer3Opacity: 1.0,
  },
  press: {
    layer1Opacity: 0.7,
    layer2Opacity: 0.9,
    layer3Opacity: 1.0,
  },
};

export function OrbGlow({
  size,
  activeState = "default",
  style,
  animationDuration = 8,
  colors = ["#FFFFFF", "#FFFFFF"],
  opacityMultiplier = 1.0,
}: OrbGlowProps) {
  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);

  // Pulsing animation similar to recent tastes card
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    // Continuous pulse animation - faster and more pronounced
    pulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
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

  // Animated pulse opacity - much larger range for more visible breathing
  const pulseOpacity = useDerivedValue(() => {
    // Pulse between 0.7 and 1.3 for very visible breathing animation
    return 0.7 + (pulseProgress.value * 0.6);
  });

  const layer1Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer1Opacity;
    return baseOpacity * pulseOpacity.value;
  });

  const layer2Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer2Opacity;
    return baseOpacity * pulseOpacity.value;
  });

  const layer3Opacity = useDerivedValue(() => {
    const baseOpacity = STATE_CONFIG[activeState].layer3Opacity;
    return baseOpacity * pulseOpacity.value;
  });

  // Convert prop to shared value to ensure updates trigger re-calculation
  const opacityMultiplierSv = useSharedValue(opacityMultiplier);

  useEffect(() => {
    opacityMultiplierSv.value = withTiming(opacityMultiplier, { duration: 300 });
  }, [opacityMultiplier, opacityMultiplierSv]);

  // Final opacity values with multipliers for each layer (half opacity for subtlety)
  const layer1Final = useDerivedValue(() => layer1Opacity.value * 0.025 * opacityMultiplierSv.value);
  const layer2Final = useDerivedValue(() => layer2Opacity.value * 0.05 * opacityMultiplierSv.value);
  const layer3Final = useDerivedValue(() => layer3Opacity.value * 0.1 * opacityMultiplierSv.value);

  // Canvas needs to be larger than the orb to avoid clipping the glow
  // Reduced multiplier for tighter glow (was 2, now 1.6)
  const canvasSize = size * 1.6;
  const center = canvasSize / 2;

  return (
    <Canvas style={{
      width: canvasSize,
      height: canvasSize,
      position: 'absolute',
      top: -(canvasSize - size) / 2,
      left: -(canvasSize - size) / 2,
      pointerEvents: 'none',
      zIndex: -1
    }}>
      {/* Tight edge glow - very close to orb surface */}
      <Circle cx={center} cy={center} r={orbRadius * 1.15} color={colors[0]} opacity={layer1Final}>
        <BlurMask blur={40} style="normal" />
      </Circle>

      {/* Mid border trace */}
      <Circle cx={center} cy={center} r={orbRadius * 1.08} color={colors[0]} opacity={layer2Final}>
        <BlurMask blur={24} style="normal" />
      </Circle>

      {/* Sharp edge highlight - right on the border */}
      <Circle cx={center} cy={center} r={orbRadius * 1.02} color={colors[0]} opacity={layer3Final}>
        <BlurMask blur={12} style="normal" />
      </Circle>
    </Canvas>
  );
}



export default OrbGlow;