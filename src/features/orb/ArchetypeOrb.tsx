import OrbGlow from "@/components/orb/OrbGlow";
import GlassOrb from "@/components/three/orb/GlassOrb";
import { blendArchetypeColors } from "@/utils/archetypeColorBlend";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

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
  showGlow?: boolean;
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
  showGlow = true,
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

  const colors = useMemo<BlendResult>(() => {
    const result = blendArchetypeColors(sanitizedData) as BlendResult;
    return result;
  }, [sanitizedData]);

  const [glowState, setGlowState] = useState<"default" | "hover" | "press">("default");
  const [isOrbReady, setIsOrbReady] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Fade in glow when orb is ready
  React.useEffect(() => {
    if (isOrbReady) {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isOrbReady, glowOpacity]);

  const handlePress = () => {
    if (!interactive) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    setGlowState("press");
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.08,
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

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow behind the orb - overflows visually */}
      {showGlow && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
          <OrbGlow
            size={size}
            activeState={glowState}
            animationDuration={8}
            colors={[colors.colorA, colors.colorB]}
          />
        </Animated.View>
      )}

      {/* Orb with scale animation */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <GlassOrb
          size={size}
          colorA={colors.colorA}
          colorB={colors.colorB}
          colorC={colors.colorC}
          palette={colors.palette}
          startupDuration={0}
          transitionDuration={0}
          onReady={() => setIsOrbReady(true)}
        />

        {interactive && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handlePress}
            android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true }}
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
  },
});

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
  if (prevProps.showGlow !== nextProps.showGlow) return false;
  return true;
};

export default React.memo(ArchetypeOrb, areEqual);