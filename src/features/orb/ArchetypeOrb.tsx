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
  glowOpacityMultiplier?: number;
  startupDuration?: number;
  transitionDuration?: number;
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
  glowOpacityMultiplier = 1.0,
  startupDuration = 0,
  transitionDuration = 0,
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
    // Enhanced logging to debug glow color issues
    console.log('[ArchetypeOrb] Archetype blend details:', { 
      inputData: sanitizedData,
      colorA: result.colorA, 
      colorB: result.colorB,
      colorC: result.colorC,
      blendedColor: result.blendedColor,
      palette: result.palette
    });
    return result;
  }, [sanitizedData]);

  const [glowState, setGlowState] = useState<"default" | "hover" | "press">("default");
  const [isOrbReady, setIsOrbReady] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current; // Start hidden

  // Fade in glow when orb is ready
  React.useEffect(() => {
    if (isOrbReady) {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 800,
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
      {/* Glow behind orb - render first so it's actually behind */}
      {showGlow && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity, pointerEvents: 'none' }]}>
          <OrbGlow
            size={size}
            activeState={glowState}
            animationDuration={8}
            colors={[colors.colorA, colors.colorB]}
            opacityMultiplier={glowOpacityMultiplier}
          />
        </Animated.View>
      )}

      {/* Orb with scale animation - render after glow so it's on top */}
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
          startupDuration={startupDuration}
          transitionDuration={transitionDuration}
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
    alignItems: "center",
    justifyContent: "center",
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
  if (prevProps.showGlow !== nextProps.showGlow) return false;
  if (prevProps.startupDuration !== nextProps.startupDuration) return false;
  if (prevProps.transitionDuration !== nextProps.transitionDuration) return false;

  // Deep compare archetypeData
  if (prevProps.archetypeData !== nextProps.archetypeData) {
    const prev = prevProps.archetypeData || [];
    const next = nextProps.archetypeData || [];
    if (prev.length !== next.length) return false;

    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      const n = next[i];
      if (
        p.color !== n.color ||
        p.percentage !== n.percentage ||
        p.score !== n.score
      ) {
        return false;
      }
    }
  }

  return true;
};

export default React.memo(ArchetypeOrb, areEqual);