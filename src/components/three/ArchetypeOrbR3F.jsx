const SAFE_MODE = true; // Emergency: disable shader smoke on mobile until stable

function SafeSmoke({ config, count = 180, renderOrder = 1 }) {
  const groupRef = useRef();
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const width  = Math.min(config.dimensions?.width  ?? 0.9, 0.92);
    const length = Math.min(config.dimensions?.length ?? 0.88, 0.92);
    const depth  = Math.min(config.dimensions?.depth  ?? 0.86, 0.92);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2.0 * Math.PI * u;
      const phi = Math.acos(2.0 * v - 1.0);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);
      const radius = Math.pow(Math.random(), 0.7) * 0.98;
      positions[i*3+0] = dirX * width  * radius;
      positions[i*3+1] = dirY * length * radius;
      positions[i*3+2] = dirZ * depth  * radius;
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [config.dimensions]);

  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 0.06,
    sizeAttenuation: true,
    color: new THREE.Color(config.color || '#9aa0a6'),
    transparent: true,
    opacity: Math.min(0.45, Math.max(0.2, config.opacity ?? 0.35)),
    depthWrite: false,
    depthTest: false,
  }), [config.color, config.opacity]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const spin = (config.rotationSpeed || 0.08);
    groupRef.current.rotation.y += spin * delta;
    groupRef.current.rotation.x += spin * 0.2 * delta;
  });

  return (
    <group ref={groupRef} position={config.position} renderOrder={renderOrder}>
      <points geometry={geom} material={mat} renderOrder={renderOrder} />
    </group>
  );
}
// ArchetypeOrbR3F.jsx
import { Canvas, useFrame } from "@react-three/fiber/native";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import { processArchetypeData } from "../../utils/archetypeDataTransformer";

/**
 * Perf changes vs your original:
 * - DPR capped lower: [1, 1.25]
 * - Particle count curve softened; hard cap
 * - Removed <Float> wrapper (less per-frame CPU)
 * - Cheaper vertex "flow" (no atan/length per-vertex)
 * - Depth test ON for natural self-occlusion, depthWrite OFF to avoid sorting hell
 * - Simpler fragment math, highp precision to reduce banding on some iPhones
 * - Stable rotation only; removed orbital drift
 */

function SmokeSprites({ config, renderOrder = 10 }) {
  const groupRef = useRef();

  // Base particles + scaled by percentage with a gentle curve.
  const pct = Math.max(0, Math.min(1, config.percentage ?? 0));
  const count = Math.min(
    320, // ultra-safe cap for iOS
    Math.floor(200 + Math.pow(pct, 1.15) * 220)
  );

  // Clamp to orb interior
  const width  = Math.min(config.dimensions?.width  ?? 0.9, 0.92);
  const length = Math.min(config.dimensions?.length ?? 0.88, 0.92);
  const depth  = Math.min(config.dimensions?.depth  ?? 0.86, 0.92);

  const uniforms = useRef({
    uTime:       { value: 0 },
    uColor:      { value: new THREE.Color(config.color || '#aaaaaa') },
    uOpacity:    { value: config.opacity ?? 0.5 },
    uClipCenter: { value: new THREE.Vector3(0, 0, 0) },
    uClipRadius: { value: 0.995 },
    uSizeScale:  { value: 12.0 },            // slightly smaller sprites
    uSpin:       { value: 0.4 },             // swirl speed
  });

  const geometry = useMemo(() => {
    // Simple unit quad for all instances
    const base = new THREE.PlaneGeometry(1, 1, 1, 1).toNonIndexed();
    const inst = new THREE.InstancedBufferGeometry();
    inst.setAttribute("position", base.attributes.position);
    inst.setAttribute("uv", base.attributes.uv);

    // Per-instance attributes
    const offsets = new Float32Array(count * 3); // base position in an ellipsoid
    const seeds   = new Float32Array(count * 3); // random seeds
    const sizes   = new Float32Array(count);     // sprite size
    const alphas  = new Float32Array(count);     // per-instance alpha
    const cylRA   = new Float32Array(count * 2); // cylindrical (radius, baseAngle) for cheaper swirl

    for (let i = 0; i < count; i++) {
      // Random point in ellipsoid interior, biased toward center
      const u = Math.random();
      const v = Math.random();
      const theta = 2.0 * Math.PI * u;
      const phi = Math.acos(2.0 * v - 1.0);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);
      const radius = Math.pow(Math.random(), 0.55) * 0.99;
      const px = dirX * width  * radius;
      const py = dirY * length * radius;
      const pz = dirZ * depth  * radius;

      offsets[i * 3 + 0] = px;
      offsets[i * 3 + 1] = py;
      offsets[i * 3 + 2] = pz;

      // Seeds
      seeds[i * 3 + 0] = Math.random() * 1000.0;
      seeds[i * 3 + 1] = Math.random() * 1000.0;
      seeds[i * 3 + 2] = Math.random() * 1000.0;

      // Sprite size and alpha
      sizes[i]  = 0.8 + Math.random() * 1.1;
      alphas[i] = 0.5 + Math.random() * 0.35;

      // Precompute cylindrical radius and base angle in XZ to avoid atan/length in shader
      const r  = Math.sqrt(px * px + pz * pz);
      const ang = Math.atan2(pz, px);
      cylRA[i * 2 + 0] = r;
      cylRA[i * 2 + 1] = ang;
    }

    inst.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    inst.setAttribute("aSeed",   new THREE.InstancedBufferAttribute(seeds, 3));
    inst.setAttribute("aSize",   new THREE.InstancedBufferAttribute(sizes, 1));
    inst.setAttribute("aAlpha",  new THREE.InstancedBufferAttribute(alphas, 1));
    inst.setAttribute("aCylRA",  new THREE.InstancedBufferAttribute(cylRA, 2));
    inst.instanceCount = count;
    return inst;
  }, [count, width, length, depth]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: uniforms.current,
      vertexShader: `
        uniform float uTime;
        uniform float uSizeScale;
        uniform float uSpin;

        attribute vec3 aSeed;
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aOffset;
        attribute vec2 aCylRA; // [radius, baseAngle]

        varying float vAlpha;
        varying vec3  vWorldCenter;
        varying vec2  vUv;

        // light wobble using seeds; avoids heavy trig combos
        vec3 wobble(vec3 p, vec3 s, float t){
          float w1 = sin(t * 0.7 + s.x * 0.013) * 0.06;
          float w2 = cos(t * 0.5 + s.y * 0.017) * 0.05;
          float w3 = sin(t * 0.6 + s.z * 0.011) * 0.05;
          return p + vec3(w1, w2, w3);
        }

        void main(){
          vUv = uv;

          // Cylindrical swirl in XZ using precomputed radius and baseAngle
          float r   = aCylRA.x;
          float ang = aCylRA.y + uTime * uSpin + aSeed.x * 0.002;
          float cx = cos(ang) * r;
          float cz = sin(ang) * r;

          // Y movement is slow, gentle rise and fall
          float cy = aOffset.y + sin(uTime * 0.35 + aSeed.y * 0.01) * 0.09;

          vec3 center = wobble(vec3(cx, cy, cz), aSeed, uTime);

          vec4 worldCenter = modelMatrix * vec4(center, 1.0);
          vWorldCenter = worldCenter.xyz;

          // Billboard quad in view space
          vec4 mvCenter = viewMatrix * worldCenter;
          float s = clamp(aSize * uSizeScale, 4.0, 36.0);
          vec2 quad = position.xy * s;
          vec4 mvPos = mvCenter + vec4(quad, 0.0, 0.0);

          gl_Position = projectionMatrix * mvPos;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform vec3  uColor;
        uniform float uOpacity;
        uniform vec3  uClipCenter;
        uniform float uClipRadius;

        varying float vAlpha;
        varying vec3  vWorldCenter;
        varying vec2  vUv;

        void main(){
          // Soft spherical clip near orb shell
          float dWorld = length(vWorldCenter - uClipCenter);
          float clipAlpha = smoothstep(uClipRadius, uClipRadius - 0.16, dWorld);

          // Soft round sprite using UV
          vec2 uv = vUv - 0.5;
          float d = dot(uv, uv);
          float radial = smoothstep(0.75, 0.0, sqrt(d));

          // Cheap wispy modulation that doesn't repeat too obviously
          float n = sin(uv.x * 13.0) * sin(uv.y * 11.0) * 0.25
                  + sin((uv.x + uv.y) * 7.0) * 0.15 + 0.6;

          float alpha = radial * n * clipAlpha * uOpacity * vAlpha;
          if (alpha < 0.02) discard;

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      // Enable depth test so nearer smoke attenuates far smoke naturally
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);

  useEffect(() => {
    // Sync uniforms on prop changes
    if (uniforms.current?.uColor) uniforms.current.uColor.value.set(config.color || '#aaaaaa');
    if (uniforms.current?.uOpacity) uniforms.current.uOpacity.value = config.opacity ?? 0.5;
  }, [config.color, config.opacity]);

  useFrame((_, delta) => {
    // Drive global time and slow spin; keep it cheap
    uniforms.current.uTime.value = (uniforms.current.uTime.value + delta) % 1000.0;
    if (!groupRef.current) return;
    const spin = config.rotationSpeed || 0.12;
    groupRef.current.rotation.y += spin * delta;
    groupRef.current.rotation.x += spin * 0.25 * delta;
  });

  return (
    <group ref={groupRef} position={config.position} renderOrder={renderOrder}>
      <instancedMesh
        args={[undefined, undefined, count]}
        geometry={geometry}
        frustumCulled={false}
        renderOrder={renderOrder}
      >
        <primitive object={material} attach="material" />
      </instancedMesh>
    </group>
  );
}

function OrbDepthPrepass({ quality = "high" }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[1, seg, seg]} />
      <meshBasicMaterial depthWrite={true} colorWrite={false} />
    </mesh>
  );
}

function OrbShell({ quality = "high", refraction = false }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[1, seg, seg]} />
      {refraction ? (
        <meshPhysicalMaterial
          transmission={0.92}
          thickness={0.5}
          ior={1.45}
          roughness={0.08}
          metalness={0.02}
          clearcoat={0.95}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.DoubleSide}
          color={0xffffff}
        />
      ) : (
        <meshPhysicalMaterial
          transparent
          opacity={0.34}
          roughness={0.12}
          metalness={0.06}
          reflectivity={0.85}
          clearcoat={0.9}
          clearcoatRoughness={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
          color={0xffffff}
        />
      )}
    </mesh>
  );
}

function OrbScene({ configs, quality, groupRef, refraction }) {
  const localRef = groupRef || useRef();
  useFrame((_, delta) => {
    if (localRef.current) localRef.current.rotation.y += delta * 0.08;
  });
  return (
    <group ref={localRef}>
      {/* Lighting simplified for Safe Mode */}
      <ambientLight intensity={0.4} />
      <hemisphereLight skyColor={'#ffffff'} groundColor={'#909090'} intensity={0.35} />

      <OrbDepthPrepass quality={quality} />
      {SAFE_MODE
        ? configs.map((cfg, idx) => (
            <SafeSmoke key={cfg.id || cfg.name || idx} config={cfg} renderOrder={1 + idx} />
          ))
        : configs.map((cfg, idx) => (
            <SmokeSprites key={cfg.id || cfg.name || idx} config={cfg} renderOrder={1 + idx} />
          ))}
      <OrbShell quality={quality} refraction={refraction} />
    </group>
  );
}

export default function ArchetypeOrbR3F({
  archetypeData,
  size = 220,
  quality = "high",
  refraction = false,
  style,
}) {
  const configs = useMemo(
    () => processArchetypeData(archetypeData, { allowFallback: false }),
    [archetypeData]
  );

  // Avoid multiple-three warnings on native
  if (typeof global !== "undefined") {
    if (!global.THREE) global.THREE = THREE;
  }

  const dpr = [1, 1]; // lower DPR cap to reduce fragment cost

  return (
    <View
      collapsable={false}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 3.6], fov: 40, near: 0.1, far: 100 }}
        frameloop="always"
        msaaSamples={0}
        events={undefined}
        shadows={false}
        gl={{
          powerPreference: "high-performance",
          alpha: true,
          antialias: false,
          stencil: false,
          depth: true,              // smoke uses depthTest=true; need depth buffer for prepass
          preserveDrawingBuffer: false,
          xrCompatible: false,
        }}
        onCreated={(state) => {
          try { state.gl.setClearColor(0x000000, 0); } catch (_) {}
          if (THREE?.ColorManagement) {
            try { THREE.ColorManagement.enabled = false; } catch (_) {}
          }
          state.scene.toneMapping = THREE.NoToneMapping;

          // Make sure native GL isn't enabling extra multi-sample paths
          try {
            const gl = state.gl;
            if (gl?.disable) {
              try { gl.disable(gl.SAMPLE_COVERAGE); } catch (_) {}
              try { gl.disable(0x809D); } catch (_) {} // MULTISAMPLE
            }
          } catch (_) {}
        }}
        style={styles.canvas}
      >
        <OrbScene configs={configs} quality={quality} refraction={refraction} />
      </Canvas>
    </View>
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
