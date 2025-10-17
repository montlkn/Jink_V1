import { useFrame } from "@react-three/fiber/native";
import React, { useRef } from "react";
import VolSmoke from "./VolSmoke";

/**
 * VolSmokeLayer: Wrapper for VolSmoke that handles transforms and animation
 *
 * Props:
 * - color: smoke color (hex or THREE.Color)
 * - density: 0..1
 * - brightness: 0..2+
 * - turbulence: 0..1
 * - noiseScale: scale of noise pattern
 * - scale: layer scale (default 1.0)
 * - position: [x, y, z] offset
 * - rotationSpeed: radians/sec rotation speed
 * - rotationAxis: axis to rotate around (default [0, 1, 0])
 * - shellRadius: visual size
 * - renderOrder: render order
 */
export default function VolSmokeLayer({
  color,
  density,
  brightness,
  turbulence,
  noiseScale,
  scale = 1.0,
  position = [0, 0, 0],
  rotationSpeed = 0.1,
  rotationAxis = [0, 1, 0],
  shellRadius,
  renderOrder,
}) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Apply rotation based on rotationSpeed
      const [ax, ay, az] = rotationAxis;
      groupRef.current.rotation.x += ax * rotationSpeed * delta;
      groupRef.current.rotation.y += ay * rotationSpeed * delta;
      groupRef.current.rotation.z += az * rotationSpeed * delta;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <VolSmoke
        color={color}
        density={density}
        brightness={brightness}
        turbulence={turbulence}
        noiseScale={noiseScale}
        scale={scale}
        shellRadius={shellRadius}
        renderOrder={renderOrder}
      />
    </group>
  );
}
