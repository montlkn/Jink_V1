import React, { useEffect, useRef } from "react";
import { Gyroscope } from "expo-sensors";

/**
 * GyroLightRig: Maps device gyroscope motion to light/environment rotation
 *
 * Creates subtle parallax effect by rotating lights around the orb based on phone orientation.
 * Uses low-pass filtering to smooth jittery sensor data and clamps rotation to prevent nausea.
 *
 * Props:
 * - target: ref to the group to rotate (lights or env holder)
 * - mode: "lights" or "env" (default "lights")
 * - sensitivity: motion multiplier, 0..1 (default 0.5)
 * - maxRotation: max rotation in radians (default 0.35 = ~20°)
 */
export default function GyroLightRig({
  target,
  mode = "lights",
  sensitivity = 0.5,
  maxRotation = 0.35,
}) {
  const rot = useRef({ x: 0, y: 0 });
  const isAvailable = useRef(false);

  useEffect(() => {
    // Check if gyroscope is available
    Gyroscope.isAvailableAsync().then((available) => {
      isAvailable.current = available;
      if (!available) {
        console.warn("[GyroLightRig] Gyroscope not available on this device");
      }
    });

    if (!isAvailable.current) return;

    const alpha = 0.15; // Low-pass filter coefficient (lower = smoother)
    const clamp = (v) => Math.max(-maxRotation, Math.min(maxRotation, v));

    const subscription = Gyroscope.addListener(({ x, y, z }) => {
      // Integrate gyro rates with low-pass filter
      rot.current.x = rot.current.x * (1 - alpha) + x * alpha * sensitivity;
      rot.current.y = rot.current.y * (1 - alpha) + y * alpha * sensitivity;

      // Apply clamped rotation to target
      if (target?.current) {
        target.current.rotation.x = clamp(rot.current.y);
        target.current.rotation.y = clamp(rot.current.x);
      }
    });

    // Set update interval to 16ms (~60fps)
    Gyroscope.setUpdateInterval(16);

    return () => {
      subscription.remove();
    };
  }, [target, sensitivity, maxRotation]);

  return (
    <group>
      {/* Ambient base lighting */}
      <ambientLight intensity={0.3} />

      {/* Hemisphere for subtle sky/ground gradient */}
      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#666666"
        intensity={0.5}
      />

      {/* Key directional light */}
      <directionalLight position={[3, 2, 2]} intensity={0.9} color="#ffffff" />

      {/* Fill lights for depth */}
      <pointLight position={[-2, 1, -1]} intensity={0.4} color="#e8f4ff" />
      <pointLight position={[1, -2, 2]} intensity={0.3} color="#ffe8f4" />
    </group>
  );
}
