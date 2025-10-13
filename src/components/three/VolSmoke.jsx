import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber/native";
import * as THREE from "three";

// Lightweight volumetric smoke via ray-marched FBM inside a unit sphere.
// Mobile-safe defaults: ~20 steps, 3 fbm octaves, depthTest on, depthWrite off.

export default function VolSmoke({
  color = "#88aaff",
  opacity = 0.5,
  density = 0.6, // 0..1, scales absorption
  scale = 1.0,   // sphere scale
  rotationSpeed = 0.1,
  steps = 20,
  noiseScale = 1.6,
  position = [0, 0, 0],
  renderOrder = 1,
}) {
  const groupRef = useRef();
  const materialRef = useRef();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uDensity: { value: density },
    uSteps: { value: steps },
    uNoiseScale: { value: noiseScale },
  }), []);

  // Keep uniforms in sync with props
  React.useEffect(() => {
    if (uniforms.uColor) uniforms.uColor.value.set(color);
  }, [color]);
  React.useEffect(() => {
    if (uniforms.uOpacity) uniforms.uOpacity.value = opacity;
  }, [opacity]);
  React.useEffect(() => {
    if (uniforms.uDensity) uniforms.uDensity.value = density;
  }, [density]);
  React.useEffect(() => {
    if (uniforms.uSteps) uniforms.uSteps.value = steps;
  }, [steps]);
  React.useEffect(() => {
    if (uniforms.uNoiseScale) uniforms.uNoiseScale.value = noiseScale;
  }, [noiseScale]);

  useFrame((_, delta) => {
    uniforms.uTime.value = (uniforms.uTime.value + delta) % 10000.0;
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * delta;
      groupRef.current.rotation.x += rotationSpeed * 0.25 * delta;
    }
  });

  return (
    <group ref={groupRef} position={position} renderOrder={renderOrder}>
      <mesh scale={scale} renderOrder={renderOrder}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          depthTest
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vPos;
            void main(){
              vPos = position; // object-space sphere position
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            precision highp float;
            varying vec3 vPos; // object-space surface position
            uniform vec3  uColor;
            uniform float uOpacity;
            uniform float uDensity;
            uniform int   uSteps;
            uniform float uNoiseScale;
            uniform float uTime;

            // Hash/Noise/FBM (3D)
            float hash(vec3 p){
              p = fract(p * 0.3183099 + vec3(0.1,0.2,0.3));
              p *= 17.0;
              return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 x){
              vec3 i = floor(x);
              vec3 f = fract(x);
              f = f*f*(3.0-2.0*f);
              float n = mix(
                mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                    mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                    mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
              return n;
            }
            float fbm(vec3 p){
              float v = 0.0;
              float a = 0.5;
              mat3 m = mat3(1.6,1.2,0.0, -1.2,1.6,0.0, 0.0,0.0,1.6);
              for(int i = 0; i < 3; i++){
                v += a * noise(p);
                p = m * p + vec3(0.1);
                a *= 0.5;
              }
              return v;
            }

            // Ray-sphere intersection (unit sphere at origin in object space)
            bool intersectSphere(vec3 ro, vec3 rd, out float t0, out float t1){
              float b = dot(ro, rd);
              float c = dot(ro, ro) - 1.0;
              float h = b*b - c;
              if (h < 0.0) return false;
              h = sqrt(max(h, 0.0));
              t0 = -b - h;
              t1 = -b + h;
              return t1 > 0.0;
            }

            void main(){
              // Camera position in object space
              vec3 ro = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
              // Ray direction in object space towards current surface
              vec3 rd = normalize(vPos - ro);

              float tNear, tFar;
              if (!intersectSphere(ro, rd, tNear, tFar)) discard;
              tNear = max(tNear, 0.0);

              // Integrate density along the ray
              int MAX_STEPS = 28;
              int N = min(uSteps, MAX_STEPS);
              float T = 1.0;          // transmittance
              vec3 acc = vec3(0.0);   // accumulated color
              float dt = (tFar - tNear) / float(N);

              // Animate a gentle swirl by rotating sample space over time
              float rot = 0.6 * uTime;
              mat3 R = mat3(
                cos(rot), 0.0, sin(rot),
                0.0,      1.0, 0.0,
                -sin(rot),0.0, cos(rot)
              );

              for (int i = 0; i < 28; i++){
                if (i >= N) break;
                float t = tNear + (float(i) + 0.5) * dt;
                vec3 p = ro + rd * t;  // object space sample

                // Soft inner falloff to keep brightness near center and fade at edges
                float r = clamp(length(p), 0.0, 1.0);
                float edge = smoothstep(1.0, 0.7, r);

                // FBM field
                vec3 q = R * (p * uNoiseScale + vec3(0.0, uTime * 0.1, 0.0));
                float d = fbm(q);

                // Map noise to density and convert to alpha with Beer-Lambert
                float sigma = clamp(d * edge * uDensity, 0.0, 1.0);
                float a = 1.0 - exp(-sigma * dt * 6.0); // tune 6.0 as absorption factor
                vec3 c = uColor;

                acc += T * a * c;
                T *= (1.0 - a);
                if (T < 0.02) break;
              }

              float alpha = (1.0 - T) * uOpacity;
              if (alpha < 0.01) discard;
              gl_FragColor = vec4(acc, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

