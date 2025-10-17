import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import React, { useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from 'expo-haptics';
import * as THREE from "three";
import { archetypeDataToLayers, getDefaultLayers } from "./ArchetypeMapping";
import VolSmoke from "./VolSmokeAnalytic";
import VolSmokeUnifiedAnalytic from "./VolSmokeUnifiedAnalytic";

// Smoke layer wrapper - no rotation, motion comes from noise animation
function SmokeLayer({ layer, index, shellRadius }) {
  return (
    <VolSmoke
      color={layer.color}
      density={layer.density}
      brightness={layer.brightness}
      turbulence={layer.turbulence}
      noiseScale={layer.noiseScale}
      timeScale={layer.timeScale}
      scale={layer.scale}
      position={layer.position}
      shellRadius={shellRadius}
      renderOrder={10 + index}
      steps={layer.steps}
      warpAmp={layer.warpAmp}
      useLite={layer.useLite}
    />
  );
}

/**
 * ArchetypeOrbV2: Volumetric glass orb with raymarched smoke layers
 *
 * Props:
 * - archetypeData: array of archetype objects with name/percentage/score
 * - xpLevel: current XP level (affects brightness)
 * - xpProgress: 0..1 progress within current level
 * - size: diameter in pixels (default 300)
 * - lod: "ultra" | "standard" | "low" | "safe" (default "standard")
 * - animateOrbMotion: gentle rotation (default true)
 * - shellRadius: collision radius for smoke (default 0.98)
 * - style: additional React Native styles
 * - onPress: callback for press events
 * - interactive: enable press events (default false)
 */

const LOD_PRESETS = {
  ultra:   { dpr: [1, 1.15], steps: 16, warpAmp: 0.12, useLite: false },
  standard:{ dpr: [0.9, 1],  steps: 14, warpAmp: 0.10, useLite: false },
  low:     { dpr: [0.75, 1], steps: 12, warpAmp: 0.08, useLite: true  },
  safe:    { dpr: [0.75, 0.9], steps: 10, warpAmp: 0.07, useLite: true  },
};

function OrbScene({ layers, shellRadius, animateOrbMotion, lodSettings, densityBoost = 1.7, motionBoost = 1.3, blendMode = "add" }) {
  const groupRef = React.useRef();
  const { invalidate } = useThree();
  // Modify layer configs - center all, vary noise params not position
  const overlappingLayers = useMemo(() => {
    return layers.map((layer, index) => ({
      ...layer,
      // Keep layers centered; vary the underlying field instead of transforms
      position: [0.0, 0.0, 0.0],
      scale: 1.0,
      // Per-layer separation for core / mid / halo
      noiseScale:  [2.6, 3.2, 4.0][index] ?? 3.2,
      timeScale:   [0.36, 0.46, 0.28][index] ?? 0.36,
      density:     [0.55, 0.35, 0.22][index] ?? 0.35,
      brightness:  [1.35, 1.18, 1.10][index] ?? 1.18,
      // Keep mild turbulence for mobile-safe motion coupling
      turbulence:  [1.0, 1.1, 0.9][index] ?? 1.0,
      // LOD-driven perf controls
      steps: lodSettings.steps,
      warpAmp: lodSettings.warpAmp,
      useLite: lodSettings.useLite,
    }));
  }, [layers, lodSettings]);

  // Build unified inputs
  const top3 = overlappingLayers.slice(0, 3);
  const colors = top3.map(l => l.color);
  const densities = top3.map(l => l.density);
  const avgBrightness = top3.reduce((a,l)=>a + (l.brightness ?? 1), 0) / Math.max(1, top3.length || 1);
  const avgTimeScale = top3.reduce((a,l)=>a + (l.timeScale ?? 0.4), 0) / Math.max(1, top3.length || 1);

  // Drive render at ~30fps on demand-based loop
  React.useEffect(() => {
    const id = setInterval(() => invalidate(), 33);
    return () => clearInterval(id);
  }, [invalidate]);

  return (
    <group ref={groupRef}>
      {/* Basic lighting for Milestone 1 - will enhance in Milestone 2 */}
      <ambientLight intensity={0.4} />
      {/* Minimal lighting; volume self-colors */}
      <hemisphereLight skyColor="#ffffff" groundColor="#666666" intensity={0.3} />

      {/* Unified single-pass analytic volume blending 3 archetype colors */}
      <VolSmokeUnifiedAnalytic
        colors={colors}
        densities={densities}
        brightness={avgBrightness}
        noiseScale={3.2}
        timeScale={avgTimeScale * 1.2}
        warpAmp={lodSettings?.warpAmp}
        densityBoost={densityBoost}
        motionBoost={motionBoost}
        blend={blendMode}
        shellRadius={shellRadius}
        renderOrder={12}
      />

      {/* Glass shell */}
      <mesh renderOrder={100}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.18}
          roughness={0.08}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.15}
          side={THREE.FrontSide}
          color={0xe8f4ff}
          depthWrite={false}
          depthTest={true}
        />
      </mesh>
    </group>
  );
}

export default function ArchetypeOrbV2({
  archetypeData = [],
  xpLevel = 1,
  xpProgress = 0,
  size = 300,
  lod = "standard",
  animateOrbMotion = true,
  shellRadius = 0.98,
  style,
  onPress,
  interactive = false,
  densityBoost,
  motionBoost,
  blendMode = "add",
  frameloop = "demand",
}) {
  // Get LOD settings
  const lodSettings = LOD_PRESETS[lod] || LOD_PRESETS.standard;

  // Convert archetype data to layer configurations
  const layers = useMemo(() => {
    if (!archetypeData || archetypeData.length === 0) {
      console.log('[ArchetypeOrbV2] No archetype data provided, using defaults');
      return getDefaultLayers();
    }

    console.log('[ArchetypeOrbV2] Using user archetype data:', archetypeData.map(a => ({
      name: a.name || a.archetype,
      percentage: a.percentage,
      color: a.color
    })));
    return archetypeDataToLayers(archetypeData, xpLevel, xpProgress);
  }, [archetypeData, xpLevel, xpProgress]);

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
        frameloop={frameloop}
        gl={{
          powerPreference: "high-performance",
          alpha: true,
          antialias: false,
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
        }}
        onCreated={(state) => {
          state.gl.setClearColor(0x000000, 0);
          state.scene.background = null;

          // Disable tone mapping for consistent colors
          if (THREE.ColorManagement) {
            THREE.ColorManagement.enabled = false;
          }
          state.scene.toneMapping = THREE.NoToneMapping;
        }}
        style={styles.canvas}
      >
        <OrbScene
          layers={layers}
          shellRadius={shellRadius}
          animateOrbMotion={animateOrbMotion}
          lodSettings={lodSettings}
          densityBoost={densityBoost}
          motionBoost={motionBoost}
          blendMode={blendMode}
        />
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
