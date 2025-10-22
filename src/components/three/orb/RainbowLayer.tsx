// @ts-nocheck
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Adds a subtle rainbow/chromatic aberration effect to create sparkle
 * This layer sits just inside the glass shell
 */
export function RainbowLayer() {
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          // Fresnel effect - stronger at edges, higher power = more concentrated at edges
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

          // Create rainbow spectrum based on position and fresnel
          float angle = atan(vPosition.y, vPosition.x) + uTime * 0.15;
          float height = vPosition.z;

          // Generate RGB shifts for chromatic aberration (slower animation)
          float r = sin(angle * 3.0 + height * 5.0 + uTime * 0.4) * 0.5 + 0.5;
          float g = sin(angle * 3.0 + height * 5.0 + uTime * 0.4 + 2.094) * 0.5 + 0.5; // 120° phase shift
          float b = sin(angle * 3.0 + height * 5.0 + uTime * 0.4 + 4.188) * 0.5 + 0.5; // 240° phase shift

          vec3 rainbow = vec3(r, g, b);

          // Only show rainbow at edges (Fresnel effect) - very subtle now
          float intensity = fresnel * 0.12;

          gl_FragColor = vec4(rainbow, intensity);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (meshRef.current && (meshRef.current.material as any).uniforms) {
      (meshRef.current.material as any).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} scale={0.98}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
