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

  useEffect(() => {
    let isMounted = true;
    let subscription;

    Gyroscope.isAvailableAsync()
      .then((available) => {
        if (!isMounted) return;

        if (!available) {
          console.warn("[GyroLightRig] Gyroscope not available on this device");
          return;
        }

        const alpha = 0.18;
        const clamp = (v) => Math.max(-maxRotation, Math.min(maxRotation, v));

        Gyroscope.setUpdateInterval(16);
        subscription = Gyroscope.addListener(({ x, y }) => {
          rot.current.x =
            rot.current.x * (1 - alpha) + x * alpha * sensitivity;
          rot.current.y =
            rot.current.y * (1 - alpha) + y * alpha * sensitivity;

          if (target?.current) {
            target.current.rotation.x = clamp(rot.current.y);
            target.current.rotation.y = clamp(rot.current.x);
          }
        });
      })
      .catch((error) => {
        console.warn("[GyroLightRig] Failed to init gyroscope:", error);
      });

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [target, sensitivity, maxRotation]);

  console.log("[GyroLightRig] Rendering lights");

  return (
    <group>
      {/* VERY bright ambient to ensure visibility */}
      <ambientLight intensity={1.5} />

      {/* Bright hemisphere */}
      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#cccccc"
        intensity={1.2}
      />

      {/* Multiple bright lights from all directions */}
      <directionalLight position={[5, 5, 5]} intensity={2.0} color="#ffffff" />
      <directionalLight position={[-5, 5, -5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, 0, 5]} intensity={2.0} color="#ffffff" />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#ffffff" />
    </group>
  );
}
