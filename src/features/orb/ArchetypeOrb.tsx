import GlassOrb from "@/components/three/orb/GlassOrb";
import { defaultRainbow } from "@/config/glowConfig";
import { blendArchetypeColors } from "@/utils/archetypeColorBlend";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Glow from "react-native-animated-glow";

export type ArchetypeEntry = {
  color?: string | null;
  percentage?: number | null;
  score?: number | null;
};

type ArchetypeOrbProps = {
  size?: number;
  archetypeData?: ArchetypeEntry[];
  onPress?: () => void;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  xpLevel?: number;
  xpProgress?: number;
  lod?: string;
};

type BlendPaletteEntry = {
  color: string;
  weight: number;
};

type BlendResult = {
  blendedColor: string;
  colorA: string;
  colorB: string;
  colorC: string;
  palette: BlendPaletteEntry[];
};

const ArchetypeOrb: React.FC<ArchetypeOrbProps> = ({
  size = 220,
  archetypeData = [],
  onPress,
  interactive = true,
  style,
}) => {
  const sanitizedData = useMemo(
    () =>
      archetypeData.map((entry) => ({
        color: entry.color ?? "#FFFFFF",
        percentage: Number(entry.percentage ?? entry.score ?? 0),
        score: Number(entry.score ?? entry.percentage ?? 0),
      })),
    [archetypeData]
  );

  const colors = useMemo<BlendResult>(
    () => {
      console.log('[ArchetypeOrb] Computing colors from data:', sanitizedData);
      const result = blendArchetypeColors(sanitizedData) as BlendResult;
      console.log('[ArchetypeOrb] Blended colors:', result);
      return result;
    },
    [sanitizedData]
  );



  const [glowState, setGlowState] = useState("default");
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const glowConfig = useMemo(() => {
    // Clone the config to avoid mutating the original
    const config = JSON.parse(JSON.stringify(defaultRainbow));
    // Update cornerRadius for all states to match the orb size
    config.states.forEach((state: any) => {
      if (state.preset) {
        state.preset.cornerRadius = size / 2;
      }
    });
    return config;
  }, [size]);

  const handlePress = () => {
    if (!interactive) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    setGlowState("press");
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 80,
      }),
    ]).start(() => {
        setGlowState("default");
    });

    if (onPress) {
      setTimeout(onPress, 120);
    }
  };

  console.log('[ArchetypeOrb] Rendering with size:', size, 'colors:', colors, 'interactive:', interactive);

  return (
    <Animated.View
      style={[
        { width: size, height: size, transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Glow activeState={glowState as any} preset={glowConfig} style={{ borderRadius: size / 2 }}>
        <GlassOrb
            size={size}
            colorA={colors.colorA}
            colorB={colors.colorB}
            colorC={colors.colorC}
            palette={colors.palette}
            startupDuration={0}
            transitionDuration={0}
        />
      </Glow>
      {interactive ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
          android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true }}
        />
      ) : null}
    </Animated.View>
  );
};

const areEqual = (
  prevProps: Readonly<ArchetypeOrbProps>,
  nextProps: Readonly<ArchetypeOrbProps>
) => {
  if (prevProps.size !== nextProps.size) return false;
  if (prevProps.interactive !== nextProps.interactive) return false;
  if (prevProps.onPress !== nextProps.onPress) return false;
  if (prevProps.xpLevel !== nextProps.xpLevel) return false;
  if (prevProps.xpProgress !== nextProps.xpProgress) return false;
  if (prevProps.lod !== nextProps.lod) return false;
  if (prevProps.archetypeData !== nextProps.archetypeData) return false;
  return true;
};

export default React.memo(ArchetypeOrb, areEqual);
