import { Canvas } from "@react-three/fiber/native";
import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from 'expo-haptics';
import * as THREE from "three";
import GlassOrb from "./GlassOrb";
import GyroLightRig from "./GyroLightRig";
import { useEnvMap } from "./env/envLoader";

/**
 * ArchetypeOrbV2: Glass-only orb with gyroscope-driven reflections
 *
 * Props:
 * - archetypeData: array of archetype objects with name/percentage/score
 * - xpLevel: current XP level (affects brightness)
 * - xpProgress: 0..1 progress within current level
 * - size: diameter in pixels (default 300)
 * - lod: "ultra" | "standard" | "low" | "safe" (affects geometry detail)
 * - style: additional React Native styles
 * - onPress: callback for press events
 * - interactive: enable press events (default false)
 */

const LOD_PRESETS = {
  ultra:    { dpr: [1, 1.15], segments: 96 },
  standard: { dpr: [0.9, 1],  segments: 64 },
  low:      { dpr: [0.75, 1], segments: 48 },
  safe:     { dpr: [0.75, 0.9], segments: 32 },
};

function OrbScene({ primaryColor, lodSettings }) {
  const lightRigRef = useRef();
  const envMap = useEnvMap();

  // Debug logging
  React.useEffect(() => {
    console.log("[OrbScene] Rendering with color:", primaryColor, "segments:", lodSettings.segments);
    console.log("[OrbScene] EnvMap loaded:", envMap !== null);
  }, [primaryColor, lodSettings, envMap]);

  return (
    <group ref={lightRigRef}>
      <GyroLightRig target={lightRigRef} mode="lights" />
      <GlassOrb
        size={1.0}
        color={primaryColor}
        envMap={envMap}
        segments={lodSettings.segments}
      />
    </group>
  );
}

export default function ArchetypeOrbV2({
  archetypeData = [],
  xpLevel = 1,
  xpProgress = 0,
  size = 300,
  lod = "standard",
  style,
  onPress,
  interactive = false,
  frameloop = "demand",
}) {
  // Get LOD settings
  const lodSettings = LOD_PRESETS[lod] || LOD_PRESETS.standard;

  // Extract primary archetype color for subtle glass tint
  const primaryColor = useMemo(() => {
    return 0xffffff;
  }, [archetypeData]);

  // Ensure THREE is available globally for native
  if (typeof global !== "undefined" && !global.THREE) {
    global.THREE = THREE;
  }

  // Animation state for press interaction
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    if (!interactive || !onPress) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Call onPress after short delay
    setTimeout(() => {
      if (onPress) onPress();
    }, 150);
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: size, height: size }}>
      <View
        collapsable={false}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
      >
        <Canvas
          dpr={lodSettings.dpr}
          camera={{ position: [0, 0, 3.5], fov: 42, near: 0.1, far: 100 }}
          frameloop="always"
          gl={{
            powerPreference: "high-performance",
            alpha: true,
            antialias: false,
            stencil: false,
            depth: true,
            preserveDrawingBuffer: false,
          }}
          onCreated={(state) => {
            console.log("[Canvas] Scene created, GL context ready");
            state.gl.setClearColor(0x000000, 0);
            state.scene.background = null;

            // Disable tone mapping for consistent colors
            if (THREE.ColorManagement) {
              THREE.ColorManagement.enabled = false;
            }
            state.gl.toneMapping = THREE.NoToneMapping;
            state.gl.toneMappingExposure = 1;
          }}
          style={styles.canvas}
        >
          <OrbScene primaryColor={primaryColor} lodSettings={lodSettings} />
        </Canvas>

        {/* Press handler overlay */}
        {interactive && (
          <Pressable
            onPress={handlePress}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "transparent" }]}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
});
