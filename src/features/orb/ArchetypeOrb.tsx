import OrbGlow from "@/components/glow/OrbGlow";
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
  lod?: string;
  showGlow?: boolean;
  glowOpacityMultiplier?: number;
  startupDuration?: number;
  transitionDuration?: number;
  onLoad?: () => void;
  tintColor?: string;
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
  tintColor,

  glowOpacityMultiplier = 1.0,
  startupDuration = 0,
  transitionDuration = 0,
  onLoad,
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
    
    // If tintColor is provided, blend it with the archetype colors (30% tint, 70% original)
    if (tintColor) {
      return {
        ...result,
        colorA: tintColor, // Tint the primary glass color
        // Keep colorB and colorC as archetype colors for depth
      };
    }
    
    return result;
  }, [sanitizedData, tintColor]);

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
          onReady={() => {
            setIsOrbReady(true);
            if (onLoad) onLoad();
          }}
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

// Threshold for percentage changes - only re-render if deviation > 5%
const PERCENTAGE_CHANGE_THRESHOLD = 5;

const areEqual = (
  prevProps: Readonly<ArchetypeOrbProps>,
  nextProps: Readonly<ArchetypeOrbProps>
) => {
  if (prevProps.size !== nextProps.size) return false;
  if (prevProps.interactive !== nextProps.interactive) return false;
  // Skip onPress comparison - function references often change but don't affect rendering
  if (prevProps.lod !== nextProps.lod) return false;
  if (prevProps.showGlow !== nextProps.showGlow) return false;
  if (prevProps.glowOpacityMultiplier !== nextProps.glowOpacityMultiplier) return false;
  if (prevProps.startupDuration !== nextProps.startupDuration) return false;
  if (prevProps.transitionDuration !== nextProps.transitionDuration) return false;
  if (prevProps.tintColor !== nextProps.tintColor) return false;

  // Deep compare archetypeData with 5% threshold for percentage changes
  if (prevProps.archetypeData !== nextProps.archetypeData) {
    const prev = prevProps.archetypeData || [];
    const next = nextProps.archetypeData || [];
    if (prev.length !== next.length) return false;

    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      const n = next[i];

      // Color changes always trigger re-render
      if (p.color !== n.color) return false;

      // Only re-render if percentage/score changed by more than 5%
      const prevPct = Number(p.percentage ?? p.score ?? 0);
      const nextPct = Number(n.percentage ?? n.score ?? 0);
      if (Math.abs(prevPct - nextPct) > PERCENTAGE_CHANGE_THRESHOLD) {
        return false;
      }
    }
  }

  return true;
};

export default React.memo(ArchetypeOrb, areEqual);