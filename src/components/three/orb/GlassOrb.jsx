import React, { useRef } from "react";
import * as THREE from "three";

/**
 * GlassOrb: Simple, guaranteed-to-render glass sphere
 *
 * Simplified approach that works on all React Native devices.
 * No transmission (not well supported), just basic material with lighting.
 */
export default function GlassOrb({
  size = 1.0,
  color = 0xffffff,
  envMap = null,
  segments = 64,
}) {
  const meshRef = useRef();

  console.log("[GlassOrb] Rendering with color:", color, "envMap:", envMap !== null);

  return (
    <mesh ref={meshRef} scale={size} renderOrder={100}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshStandardMaterial
        color={new THREE.Color(color)}

        // Make it shiny and reflective
        roughness={0.1}
        metalness={0.3}

        // Environment map for reflections
        envMap={envMap}
        envMapIntensity={envMap ? 1.5 : 0}

        // Make it glow slightly
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.2}

        // Rendering
        transparent={false}
        side={THREE.FrontSide}
        toneMapped={false}
      />
    </mesh>
  );
}
