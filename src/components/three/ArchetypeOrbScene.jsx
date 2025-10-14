// Using raw instancedMesh for deterministic updates
// (avoid drei <Instances> auto-updaters overriding our matrices)
// import { Instance, Instances } from '@react-three/drei/native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import { processArchetypeData } from "../../utils/archetypeDataTransformer";
import { getArchetypeColor } from "../../constants/archetypeColors";

function OrbShell({ quality = "high" }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={100}>
      <sphereGeometry args={[1, seg, seg]} />
      <meshPhysicalMaterial
        transmission={0.92}
        thickness={0.5}
        ior={1.45}
        roughness={0.08}
        metalness={0.02}
        clearcoat={0.95}
        clearcoatRoughness={0.2}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide}
        color={0xffffff}
      />
    </mesh>
  );
}

function OrbDepthPrepass({ quality = "high" }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[1, seg, seg]} />
      <meshBasicMaterial depthWrite colorWrite={false} />
    </mesh>
  );
}

function SmokeBillboards({ configs, maxCount = 240 }) {
  const ref = useRef(); // instancedMesh
  const materialRef = useRef();
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  const tmp = React.useMemo(() => new THREE.Vector3(), []);
  const instances = useMemo(() => {
    const arr = [];
    configs.forEach((cfg) => {
      // Safer counts on mobile; distribute by percentage
      const pct = Math.max(0, Math.min(1, cfg.percentage ?? 0.33));
      const perCfg = Math.floor(60 + pct * 80); // 60–140 per layer
      for (let i = 0; i < perCfg; i++) {
        arr.push({
          cfg,
          seed: Math.random() * Math.PI * 2,
          stretch: 1.2 + Math.random() * 1.0,
          offset: new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4
          ),
        });
      }
    });
    // Global cap honoring maxCount
    if (arr.length > maxCount) return arr.slice(0, maxCount);
    return arr;
  }, [configs, maxCount]);

  // Build custom per-instance color attribute to avoid reliance on instanceColor
  React.useEffect(() => {
    if (!ref.current) return;
    const mesh = ref.current;
    mesh.count = instances.length;
    const geometry = mesh.geometry;
    if (!geometry) return;
    const colors = new Float32Array(instances.length * 3);
    for (let i = 0; i < instances.length; i++) {
      const base = new THREE.Color(instances[i].cfg.color || "#8BFF2F");
      colors[i * 3 + 0] = base.r;
      colors[i * 3 + 1] = base.g;
      colors[i * 3 + 2] = base.b;
    }
    geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
    geometry.attributes.aColor.needsUpdate = true;
  }, [instances]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    const baseRadius = 0.78;
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const { offset, seed, cfg } = inst;

      const pct = Math.max(0, Math.min(1, cfg.percentage ?? 0.33));
      const baseScale = 0.32 + 0.3 * pct;
      const breathe = 0.02 * Math.sin(t * 0.22 + seed * 0.7);
      const scalar = baseScale + breathe;
      const stretch = inst.stretch;
      dummy.scale.set(scalar * stretch, scalar, 1);

      const swirl = (cfg.rotationSpeed ?? 0.2) * 0.9;
      const phase = t * swirl + seed;
      let y = offset.y + 0.05 * Math.sin(t * 0.36 + seed * 1.3);
      const x = offset.x * Math.cos(phase) - offset.z * Math.sin(phase);
      const z = offset.z * Math.cos(phase) + offset.x * Math.sin(phase);

      tmp.set(x, y, z);
      const halfWidth = 0.13 * dummy.scale.x;
      const halfHeight = 0.13 * dummy.scale.y;
      const halfDiag = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
      const radius = Math.max(0.0, baseRadius - halfDiag);
      if (tmp.length() > radius) tmp.setLength(radius);

      dummy.position.copy(tmp);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      if (u?.uTime) u.uTime.value = t;
    }
  });

  return (
    <group renderOrder={2}>
      <instancedMesh ref={ref} args={[undefined, undefined, instances.length]} renderOrder={2} frustumCulled={false}>
        <planeGeometry args={[0.26, 0.26]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          alphaTest={0}
          uniforms={{
            uOpacity: { value: 0.24 },
            uSpriteScale: { value: 1.0 },
            uTime: { value: 0 },
            uSpin: { value: 0.4 },
            uClipCenter: { value: new THREE.Vector3(0, 0, 0) },
            uClipRadius: { value: 0.78 },
          }}
          vertexShader={`
            precision highp float;
            precision highp int;

            uniform float uSpriteScale;
            uniform float uSpin;
            uniform float uTime;
            uniform vec3 uClipCenter;

            varying vec2 vUv;
            varying vec3 vColor;
            varying vec3 vViewPos;
            varying vec3 vViewCenter;

            attribute vec3 aColor;

            void main(){
              vUv = uv;
              vColor = aColor;

              vec4 worldCenter = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
              vec4 mvCenter = viewMatrix * worldCenter;
              vec3 clipCenterView = (viewMatrix * vec4(uClipCenter, 1.0)).xyz;

              float sx = length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0])) * uSpriteScale;
              float sy = length(vec3(instanceMatrix[0][1], instanceMatrix[1][1], instanceMatrix[2][1])) * uSpriteScale;

              float ang = uSpin * uTime;
              float cs = cos(ang);
              float sn = sin(ang);
              vec2 local = (uv - 0.5) * vec2(sx, sy);
              vec2 rot = vec2(cs * local.x - sn * local.y, sn * local.x + cs * local.y);

              vec4 mvPos = mvCenter + vec4(rot, 0.0, 0.0);
              vViewPos = mvPos.xyz;
              vViewCenter = clipCenterView;

              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            precision highp float;
            uniform float uOpacity;
            uniform float uTime;
            uniform vec3  uClipCenter;
            uniform float uClipRadius;
            varying vec2 vUv;
            varying vec3 vColor;
            varying vec3 vViewPos;
            varying vec3 vViewCenter;

            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
            float noise(vec2 p){
              vec2 i = floor(p), f = fract(p);
              f = f*f*(3.0 - 2.0*f);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              return mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;
            }
            float fbm(vec2 p){
              float v = 0.0; float a = 0.55; mat2 m = mat2(1.6,1.2,-1.2,1.6);
              for(int i=0;i<4;i++){ v += a * noise(p); p = m * p; a *= 0.5; }
              return v;
            }
            void main(){
              float dView = length(vViewPos - vViewCenter);
              float clipAlpha = smoothstep(uClipRadius, uClipRadius - 0.06, dView);
              float jitter = fract(sin(dot(vViewPos.xy, vec2(12.9898,78.233))) * 43758.5453);
              clipAlpha *= (0.95 + 0.05 * jitter);

              vec2 uv = vUv - 0.5;
              float r = length(uv);
              float disk = smoothstep(0.52, 0.0, r);

              vec2 flow = uv * 3.2;
              flow += 0.35 * vec2(sin(uTime * 0.2), cos(uTime * 0.22));
              float f = fbm(flow);
              float ridge = pow(1.0 - abs(2.0 * f - 1.0), 3.0);

              float fres = pow(1.0 - clamp(r, 0.0, 1.0), 3.5);

              float a = disk * ridge * fres * clipAlpha * uOpacity;
              if (a < 0.001) discard;
              a = clamp(a, 0.05, 0.45);

              vec3 col = mix(vColor, vec3(1.0), 0.1 * ridge);
              gl_FragColor = vec4(col, a);
            }
          `}
        />
      </instancedMesh>
    </group>
  );
}

const DEBUG_SMOKE = false; // disable debug visuals for performance and occlusion sanity

function OrbScene({ configs, quality = "high" }) {
  return (
    <group>
      {/* TEST D: restore full scene now that pipeline checks passed */}
      <ambientLight intensity={0.6} />
      <hemisphereLight skyColor={"#fff"} groundColor={"#888"} intensity={0.7} />
      <SmokeBillboards configs={configs} maxCount={quality === "high" ? 900 : 240} />
      {DEBUG_SMOKE && (
        <mesh position={[0, 0, 0]} renderOrder={-10}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="hotpink" depthTest={false} depthWrite={false} transparent opacity={0.9} />
        </mesh>
      )}
      <OrbShell quality={quality} />
    </group>
  );
}

export function ArchetypeOrbScene({
  archetypeData,
  size = 220,
  quality = "high",
  style,
}) {
  const configs = React.useMemo(() => {
    const list = processArchetypeData(archetypeData, { allowFallback: false }) || [];
    if (list.length) {
      return list.map((c) => ({
        ...c,
        color: c.color || getArchetypeColor(c.name || c.id),
      }));
    }
    // Friendly fallback: render a neutral, single-hue smoke while data loads
    const fallbackColor = "#8BFF2F"; // luminous green placeholder
    const placeholder = [
      { name: "Placeholder", percentage: 0.46, color: fallbackColor },
      { name: "Placeholder", percentage: 0.32, color: fallbackColor },
      { name: "Placeholder", percentage: 0.22, color: fallbackColor },
    ];
    return placeholder;
  }, [archetypeData]);
  try { console.log("Scene configs", configs); } catch (_) {}

  if (typeof global !== "undefined" && !global.THREE) global.THREE = THREE;
  const dpr = [1, 1];

  return (
    <View
      collapsable={false}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 3.2], fov: 42, near: 0.1, far: 100 }}
        frameloop="always"
        gl={{
          powerPreference: "high-performance",
          alpha: true,
          antialias: false,
          stencil: false,
          depth: true,
        }}
        onCreated={(state) => {
          try { console.log('ArchetypeOrbScene loaded'); } catch {}
          try {
            const renderer = state.gl;
            const ctx = renderer?.getContext?.();
            const rendererName = renderer?.constructor?.name || 'UnknownRenderer';
            const glRenderer = ctx?.getParameter ? ctx.getParameter(ctx.RENDERER) : 'n/a';
            console.log('GL renderer', rendererName, glRenderer);
          } catch {}
          state.scene.toneMapping = THREE.NoToneMapping;
          try {
            state.gl.setClearColor(0x000000, 0);
            const gl = state.gl;
            gl?.disable?.(gl.SAMPLE_COVERAGE);
            gl?.disable?.(0x809D);
          } catch {}
        }}
        style={styles.canvas}
      >
        <OrbScene configs={configs} quality={quality} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", backgroundColor: "transparent", overflow: "hidden" },
  canvas: { width: "100%", height: "100%" },
});

export default ArchetypeOrbScene;
