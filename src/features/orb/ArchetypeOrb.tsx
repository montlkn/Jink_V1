import React, { useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import GlassOrb from "@/components/three/orb/GlassOrb";
import { blendArchetypeColors } from "@/utils/archetypeColorBlend";

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
    () => blendArchetypeColors(sanitizedData) as BlendResult,
    [sanitizedData]
  );

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!interactive) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

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
    ]).start();

    if (onPress) {
      setTimeout(onPress, 120);
    }
  };

  return (
    <Animated.View
      style={[
        { width: size, height: size, transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <GlassOrb
        size={size}
        colorA={colors.colorA}
        colorB={colors.colorB}
        colorC={colors.colorC}
        palette={colors.palette}
      />
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
