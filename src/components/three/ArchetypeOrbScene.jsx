import { Instance, Instances } from '@react-three/drei/native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";
import { processArchetypeData } from "../../utils/archetypeDataTransformer";

function OrbShell({ quality = "high" }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={3}>
      <sphereGeometry args={[1, seg, seg]} />
      <meshPhysicalMaterial
        transparent
        opacity={0.25}
        roughness={0.12}
        metalness={0.05}
        clearcoat={0.9}
        clearcoatRoughness={0.25}
        reflectivity={0.8}
        side={THREE.DoubleSide}
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

function SmokeBillboards({ configs, maxCount = 400 }) {
  const ref = useRef();
  const materialRef = useRef();
  const instances = useMemo(() => {
    const arr = [];
    configs.forEach((cfg) => {
      // Target ~250–300 sprites per archetype at high quality
      const count = Math.max(150, Math.floor(200 + (cfg.percentage ?? 0.33) * 120));
      for (let i = 0; i < count; i++) {
        arr.push({
          cfg,
          seed: Math.random() * Math.PI * 2,
          offset: new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4
          ),
        });
      }
    });
    return arr;
  }, [configs, maxCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    instances.forEach((inst, i) => {
      const { offset, seed, cfg } = inst;
      const swirl = 0.18 + 0.05 * Math.sin(t * 0.2 + seed);
      let y = offset.y + 0.08 * Math.sin(t * 0.12 + seed);
      const x = offset.x * Math.cos(t * swirl) - offset.z * Math.sin(t * swirl);
      const z = offset.z * Math.cos(t * swirl) + offset.x * Math.sin(t * swirl);
      const radius = 0.78;
      const vec = new THREE.Vector3(x, y, z);
      if (vec.length() > radius) vec.setLength(radius);
      dummy.position.copy(vec);
      // Stable scale primarily driven by archetype dominance; tiny breathing
      const baseScale = 0.5 + 0.35 * (cfg.percentage ?? 0.33);
      const breathe = 0.02 * Math.sin(t * 0.2 + seed);
      dummy.scale.setScalar(baseScale + breathe);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    instances.forEach((inst, i) => {
      const { seed, cfg } = inst;
      const c1 = new THREE.Color(cfg.color || '#00ff00');
      const c2 = new THREE.Color(cfg.secondaryColor || '#00ffff');
      const c3 = new THREE.Color(cfg.tertiaryColor || '#ffffff');
      const mixColor = c1.clone()
        .lerp(c2, (Math.sin(seed + t * 0.35) + 1.0) * 0.5)
        .lerp(c3, (Math.cos(seed + t * 0.42) + 1.0) * 0.5);
      ref.current.setColorAt(i, mixColor);
    });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.instanceMatrix.needsUpdate = true;
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      if (u?.uTime) u.uTime.value = t;
    }
  });

  return (
    <Instances ref={ref} limit={instances.length} color={"white"}>
      <planeGeometry args={[0.25, 0.25]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        uniforms={{ uOpacity: { value: 0.62 }, uSpriteScale: { value: 2.1 }, uTime: { value: 0 } }}
        vertexShader={`
          uniform float uSpriteScale;
          varying vec2 vUv;
          varying vec3 vColor;

          void main(){
            vUv = uv;
            vColor = instanceColor;

            // Instance center in world space
            vec4 worldCenter = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

            // Camera right/up vectors in world space
            vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
            vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

            // Extract uniform scale from instanceMatrix (we set scalar scale in JS)
            float s = length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0])) * uSpriteScale;
            vec3 worldPos = worldCenter.xyz + (right * position.x + up * position.y) * s;

            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
          }
        `}
        fragmentShader={`
          precision highp float;
          uniform float uOpacity;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vColor;

          // 2D value noise + fbm for wispy alpha
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          float fbm(vec2 p){
            float v = 0.0; float a = 0.55; mat2 m = mat2(1.6,1.2,-1.2,1.6);
            for(int i=0;i<4;i++){ v += a * noise(p); p = m * p; a *= 0.55; }
            return v;
          }
          void main(){
            // radial alpha mask for a soft round sprite
            vec2 uv = vUv - 0.5;
            float r = length(uv);
            float radial = smoothstep(0.52, 0.0, r);
            // Swirled fbm field in sprite space for filaments
            float theta = atan(uv.y, uv.x);
            vec2 flow = uv * 2.3;
            flow += 0.25 * vec2(cos(theta*3.0 + uTime*0.25), sin(theta*3.0 - uTime*0.22));
            float f = fbm(flow + vec2(uTime*0.08, -uTime*0.05));
            float wispy = smoothstep(0.35, 0.85, f);
            float alpha = radial * wispy * uOpacity;
            if (alpha < 0.02) discard;
            vec3 col = vColor;
            if (length(col) < 0.001) { col = vec3(0.8, 0.8, 0.8); }
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
      {instances.map((inst, i) => (
        <Instance key={i} />
      ))}
    </Instances>
  );
}

function OrbScene({ configs, quality = "high" }) {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <hemisphereLight skyColor={"#fff"} groundColor={"#888"} intensity={0.7} />
      <OrbDepthPrepass quality={quality} />
      <SmokeBillboards configs={configs} maxCount={quality === "high" ? 900 : 240} />
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
  const configs = React.useMemo(
    () => processArchetypeData(archetypeData, { allowFallback: true }),
    [archetypeData]
  );

  if (typeof global !== "undefined" && !global.THREE) global.THREE = THREE;
  const dpr = quality === "high" ? [1, 1.3] : [1, 1.0];

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
