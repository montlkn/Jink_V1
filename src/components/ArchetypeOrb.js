import React, { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import GlassOrb from "./three/orb/GlassOrb";
import { blendArchetypeColors } from "../utils/archetypeColorBlend";

export default function ArchetypeOrb(props) {
  const {
    size = 220,
    archetypeData = [],
    onPress,
    interactive = true,
    style,
  } = props;

  // Compute blended colors from top 3 archetypes
  const colors = useMemo(() => {
    return blendArchetypeColors(archetypeData);
  }, [archetypeData]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!interactive) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);

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
      setTimeout(() => onPress(), 120);
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
}
