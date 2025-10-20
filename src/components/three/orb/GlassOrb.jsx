import React, { useRef } from "react";
import * as THREE from "three";

/**
 * GlassOrb: A single glass sphere with physical material and high-quality reflections
 *
 * Props:
 * - size: visual size multiplier (default 1.0)
 * - color: subtle tint color (default white)
 * - envMap: environment map for reflections
 * - segments: sphere geometry segments (default 64)
 */
export default function GlassOrb({
  size = 1.0,
  color = 0xffffff,
  envMap = null,
  segments = 64,
}) {
  const meshRef = useRef();

  return (
    <mesh ref={meshRef} scale={size} renderOrder={100}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshPhysicalMaterial
        // Glass properties
        transmission={0.95}
        thickness={1.0}
        ior={1.48}
        roughness={0.08}
        metalness={0}

        // Clearcoat for extra shine
        clearcoat={1.0}
        clearcoatRoughness={0.15}

        // Reflections
        envMap={envMap}
        envMapIntensity={1.3}

        // Rendering
        transparent
        opacity={0.18}
        depthWrite={false}
        depthTest={true}
        side={THREE.FrontSide}
        color={color}

        // Disable tone mapping for consistent appearance
        toneMapped={false}
      />
    </mesh>
  );
}
