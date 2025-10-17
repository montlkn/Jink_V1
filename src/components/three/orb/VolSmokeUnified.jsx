import { useFrame } from "@react-three/fiber/native";
import React, { useRef, useMemo } from "react";
import * as THREE from "three";

/**
 * VolSmokeUnified: Single raymarched volume that blends 3 archetype colors
 *
 * Instead of rendering 3 separate spheres, this renders ONE volume that samples
 * all 3 colors and blends them based on noise frequencies and position.
 *
 * Props:
 * - colors: [color1, color2, color3] - THREE.Color or hex strings
 * - densities: [density1, density2, density3] - 0..1 for each color
 * - brightness: overall brightness multiplier
 * - turbulence: animation speed
 * - shellRadius: visual size
 */
export default function VolSmokeUnified({
  colors = ["#FF69B4", "#00CED1", "#FFD700"],
  densities = [0.5, 0.35, 0.25],
  brightness = 1.2,
  turbulence = 0.5,
  shellRadius = 0.98,
  position = [0, 0, 0],
  scale = 1.0,
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColor1: { value: new THREE.Color(colors[0]) },
      uColor2: { value: new THREE.Color(colors[1]) },
      uColor3: { value: new THREE.Color(colors[2]) },
      uDensity1: { value: densities[0] },
      uDensity2: { value: densities[1] },
      uDensity3: { value: densities[2] },
      uBrightness: { value: brightness },
      uTurbulence: { value: turbulence },
    }),
    []
  );

  // Update uniforms when props change
  React.useEffect(() => {
    uniforms.uColor1.value.set(colors[0]);
    uniforms.uColor2.value.set(colors[1]);
    uniforms.uColor3.value.set(colors[2]);
    uniforms.uDensity1.value = densities[0];
    uniforms.uDensity2.value = densities[1];
    uniforms.uDensity3.value = densities[2];
    uniforms.uBrightness.value = brightness;
    uniforms.uTurbulence.value = turbulence;
  }, [colors, densities, brightness, turbulence, uniforms]);

  // Disable tone mapping
  React.useEffect(() => {
    if (materialRef.current) {
      materialRef.current.toneMapped = false;
    }
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const vertexShader = `
    varying vec3 vPosObj;
    varying vec3 vRayDirObj;

    void main() {
      vPosObj = position;

      vec4 posWorld = modelMatrix * vec4(position, 1.0);
      vec3 rayWorld = normalize(posWorld.xyz - cameraPosition);
      vRayDirObj = normalize((inverse(modelMatrix) * vec4(rayWorld, 0.0)).xyz);

      gl_Position = projectionMatrix * viewMatrix * posWorld;
    }
  `;

  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    #define STEPS 8
    #define STEP_SIZE 0.06

    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uDensity1;
    uniform float uDensity2;
    uniform float uDensity3;
    uniform float uBrightness;
    uniform float uTurbulence;

    varying vec3 vPosObj;
    varying vec3 vRayDirObj;

    // Hash-based noise
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(
          mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
          mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x),
          f.y
        ),
        mix(
          mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
          mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x),
          f.y
        ),
        f.z
      );
    }

    void main() {
      vec3 ro = vPosObj;
      vec3 rd = -normalize(vRayDirObj);

      float t = 0.0;
      vec3 colorAccum = vec3(0.0);
      float alphaAccum = 0.0;

      float timeScale = uTurbulence * 0.15;
      vec3 timeOffset = vec3(
        uTime * timeScale * 0.05,
        uTime * timeScale * 0.08,
        uTime * timeScale * 0.04
      );

      for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * t;
        if (dot(p, p) > 1.0) break;

        // Sample 3 different noise frequencies for each color
        float n1 = noise(p * 2.5 + timeOffset);
        float n2 = noise(p * 3.2 + timeOffset * 1.2);
        float n3 = noise(p * 4.0 + timeOffset * 0.8);

        // Compute contribution for each color layer
        float contrib1 = smoothstep(0.3, 0.8, n1) * uDensity1 * 0.12;
        float contrib2 = smoothstep(0.3, 0.8, n2) * uDensity2 * 0.12;
        float contrib3 = smoothstep(0.3, 0.8, n3) * uDensity3 * 0.12;

        // Blend colors additively
        colorAccum += uColor1 * contrib1;
        colorAccum += uColor2 * contrib2;
        colorAccum += uColor3 * contrib3;

        alphaAccum += contrib1 + contrib2 + contrib3;

        if (alphaAccum > 1.2) break;

        t += STEP_SIZE;
      }

      // Convert accumulated density to alpha
      float alpha = 1.0 - exp(-2.0 * alphaAccum);
      alpha = clamp(alpha, 0.0, 0.85);

      if (alpha < 0.02) discard;

      // Apply brightness but preserve color ratios
      vec3 finalColor = colorAccum * uBrightness * 1.3;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale * shellRadius * 0.92}
      renderOrder={10}
    >
      <sphereGeometry args={[1, 24, 24]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
