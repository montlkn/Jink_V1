import { Canvas, useFrame } from "@react-three/fiber/native";
import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from 'expo-haptics';
import * as THREE from "three";
import { getArchetypeColor } from "../../constants/archetypeColors";
import { processArchetypeData } from "../../utils/archetypeDataTransformer";

// Orb shell (glass)
function OrbShell({ quality = "high" }) {
  const seg = quality === "high" ? 96 : 64;
  return (
    <mesh renderOrder={100}>
      <sphereGeometry args={[1, seg, seg]} />
      <meshPhysicalMaterial
        transmission={0.92}
        thickness={0.6}
        ior={1.48}
        roughness={0.05}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.15}
        transparent
        opacity={0.55}
        depthWrite={false}
        depthTest={true}
        side={THREE.FrontSide}
        color={0xffffff}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

// Smoke system
function SmokeBillboards({ configs, maxCount = 400 }) {
  const ref = useRef();
  const materialRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const instances = useMemo(() => {
    const arr = [];
    configs.forEach((cfg) => {
      const pct = Math.max(0, Math.min(1, cfg.percentage ?? 0.33));
      const perCfg = Math.floor(100 + pct * 120);
      for (let i = 0; i < perCfg; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2.0 * Math.PI * u;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.pow(Math.random(), 0.333) * 0.95;
        arr.push({
          cfg,
          seed: Math.random() * Math.PI * 2,
          stretch: 0.8 + Math.random() * 0.6,
          offset: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.sin(phi) * Math.sin(theta) * r,
            Math.cos(phi) * r
          ),
        });
      }
    });
    return arr.slice(0, maxCount);
  }, [configs, maxCount]);

  // set per-instance colors
  React.useEffect(() => {
    if (!ref.current) return;
    const geometry = ref.current.geometry;
    const colors = new Float32Array(instances.length * 3);
    for (let i = 0; i < instances.length; i++) {
      const base = new THREE.Color(instances[i].cfg.color || "#7CFF3B");
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
    const shellRadius = 0.98;
    const collisionMargin = 0.02;

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const { offset, seed, cfg } = inst;
      const pct = Math.max(0, Math.min(1, cfg.percentage ?? 0.33));
      const baseScale = 0.32 + 0.25 * pct;
      const breathe = 0.02 * Math.sin(t * 0.3 + seed * 0.9);
      const scalar = baseScale + breathe;
      const stretch = inst.stretch;
      const swirl = (cfg.rotationSpeed ?? 0.25) * 0.6;
      const phase = t * swirl + seed;
      let y = offset.y + 0.04 * Math.sin(t * 0.4 + seed * 1.3);
      const x = offset.x * Math.cos(phase) - offset.z * Math.sin(phase);
      const z = offset.z * Math.cos(phase) + offset.x * Math.sin(phase);
      tmp.set(x, y, z);
      const distFromCenter = tmp.length();
      const collisionDist = shellRadius - collisionMargin;
      let finalScale = scalar;
      if (distFromCenter > collisionDist) {
        tmp.setLength(collisionDist);
        finalScale *= 0.7;
      }
      dummy.scale.set(finalScale * stretch, finalScale, 1);
      dummy.position.copy(tmp);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (materialRef.current?.uniforms?.uTime)
      materialRef.current.uniforms.uTime.value = t;
  });

  return (
    <group renderOrder={2}>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, instances.length]}
        renderOrder={2}
        frustumCulled={false}
      >
        <planeGeometry args={[0.3, 0.3]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          uniforms={{
            uOpacity: { value: 0.5 },
            uSpriteScale: { value: 1.2 },
            uTime: { value: 0 },
            uSpin: { value: 0.4 },
            uClipCenter: { value: new THREE.Vector3(0, 0, 0) },
            uClipRadius: { value: 0.98 },
            uSoftEdge: { value: 0.08 },
          }}
          vertexShader={`
            precision highp float;
            uniform float uSpriteScale;
            uniform float uSpin;
            uniform float uTime;
            uniform vec3 uClipCenter;
            varying vec2 vUv;
            varying vec3 vColor;
            varying vec3 vWorldPos;
            varying float vDistFromCenter;
            attribute vec3 aColor;
            void main(){
              vUv = uv;
              vColor = aColor;
              vec4 worldCenter = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
              vec4 mvCenter = viewMatrix * worldCenter;
              float sx = length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0])) * uSpriteScale;
              float sy = length(vec3(instanceMatrix[0][1], instanceMatrix[1][1], instanceMatrix[2][1])) * uSpriteScale;
              float ang = uSpin * uTime;
              float cs = cos(ang), sn = sin(ang);
              vec2 local = (uv - 0.5) * vec2(sx, sy);
              vec2 rot = vec2(cs * local.x - sn * local.y, sn * local.x + cs * local.y);
              vec4 mvPos = mvCenter + vec4(rot, 0.0, 0.0);
              vec4 worldPos = inverse(viewMatrix) * mvPos;
              vWorldPos = worldPos.xyz;
              vDistFromCenter = length(vWorldPos - uClipCenter);
              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            precision highp float;
            uniform float uOpacity;
            uniform float uTime;
            uniform float uClipRadius;
            uniform float uSoftEdge;
            varying vec2 vUv;
            varying vec3 vColor;
            varying vec3 vWorldPos;
            varying float vDistFromCenter;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
            float noise(vec2 p){
              vec2 i = floor(p), f = fract(p);
              f = f*f*(3.0-2.0*f);
              float a = hash(i);
              float b = hash(i+vec2(1.0,0.0));
              float c = hash(i+vec2(0.0,1.0));
              float d = hash(i+vec2(1.0,1.0));
              return mix(a,b,f.x)+(c-a)*f.y*(1.0-f.x)+(d-b)*f.x*f.y;
            }
            float fbm(vec2 p){
              float v=0.0; float a=0.55; mat2 m=mat2(1.6,1.2,-1.2,1.6);
              for(int i=0;i<4;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
              return v;
            }
            void main(){
              float distOverflow = vDistFromCenter - uClipRadius;
              float clipAlpha = 1.0 - smoothstep(0.0, uSoftEdge, distOverflow);
              if (clipAlpha < 0.01) discard;
              vec2 uv = vUv - 0.5;
              float r = length(uv);
              float disk = smoothstep(0.52, 0.0, r);
              vec2 flow = uv * 2.8;
              flow += 0.35 * vec2(sin(uTime * 0.25), cos(uTime * 0.22));
              float f = fbm(flow);
              float ridge = pow(1.0 - abs(2.0 * f - 1.0), 3.0);
              float fres = pow(1.0 - clamp(r, 0.0, 1.0), 3.0);
              float a = disk * ridge * fres * clipAlpha * uOpacity;
              if (a < 0.02) discard;
              vec3 col = mix(vColor, vec3(0.9,1.0,0.9), 0.3 * ridge);
              col *= (1.3 + 0.4 * ridge);
              gl_FragColor = vec4(col * a * 1.2, a);
            }
          `}
        />
      </instancedMesh>
    </group>
  );
}

// Lighting and orb group
function OrbScene({ configs, quality = "high" }) {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <hemisphereLight skyColor={"#aaaaaa"} groundColor={"#333333"} intensity={0.6} />
      <directionalLight position={[3, 3, 5]} intensity={0.6} color={"#ffffff"} />
      <pointLight position={[0, 1.2, 1.5]} intensity={0.8} distance={5} decay={2} color={"#ccffcc"} />
      <SmokeBillboards configs={configs} maxCount={quality === "high" ? 400 : 240} />
      <OrbShell quality={quality} />
    </group>
  );
}

export function ArchetypeOrbScene({
  archetypeData,
  size = 300,
  quality = "high",
  style,
  onPress,
  interactive = true,
}) {
  const [scale] = useState(new Animated.Value(1));

  const configs = useMemo(() => {
    const list = processArchetypeData(archetypeData, { allowFallback: false }) || [];
    return list.length
      ? list.map((c) => ({
          ...c,
          color: c.color || getArchetypeColor(c.name || c.id),
        }))
      : [
          { name: "Placeholder", percentage: 0.46, color: "#7CFF3B" },
          { name: "Placeholder", percentage: 0.32, color: "#7CFF3B" },
          { name: "Placeholder", percentage: 0.22, color: "#7CFF3B" },
        ];
  }, [archetypeData]);

  const handlePress = () => {
    if (!interactive) {
      return;
    }
    // Trigger haptic feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call onPress after short delay for animation feedback
    setTimeout(() => {
      if (onPress) onPress();
    }, 150);

    // Play animation feedback
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: size, height: size }}>
      <View style={{ flex: 1 }}>
        <Canvas
          dpr={[1, 1]}
          camera={{ position: [0, 0, 3.2], fov: 42 }}
          gl={{ alpha: true, antialias: false, depth: true }}
          onCreated={(state) => {
            state.scene.toneMapping = THREE.NoToneMapping;
            state.gl.setClearColor(0x000000, 0);
          }}
          style={StyleSheet.absoluteFillObject}
        >
          <OrbScene configs={configs} quality={quality} />
        </Canvas>

        {interactive ? (
          <Pressable
            onPress={handlePress}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "transparent" }]}
          />
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject} />
        )}
      </View>
    </Animated.View>
  );
}

export default ArchetypeOrbScene;
