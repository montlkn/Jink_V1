import { useFrame } from "@react-three/fiber/native";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

// VolSmokeUnifiedAnalytic: single-pass, loop-free volumetric blend of 3 colors
export default function VolSmokeUnifiedAnalytic({
  colors = ["#FF69B4", "#00CED1", "#FFD700"],
  densities = [0.5, 0.35, 0.25],
  brightness = 1.35,
  noiseScale = 3.2,
  timeScale = 0.7,
  warpAmp = 0.12,
  shellRadius = 0.98,
  position = [0, 0, 0],
  scale = 1.0,
  renderOrder = 12,
  densityBoost = 1.7,
  motionBoost = 1.3,
  blend = "add",
}) {
  const meshRef = useRef();
  const matRef = useRef();
  const tmp = useRef(new THREE.Vector3());

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamObj: { value: new THREE.Vector3(0, 0, 5) },
      uColor1: { value: new THREE.Color(colors[0]).convertSRGBToLinear?.() || new THREE.Color(colors[0]) },
      uColor2: { value: new THREE.Color(colors[1]).convertSRGBToLinear?.() || new THREE.Color(colors[1]) },
      uColor3: { value: new THREE.Color(colors[2]).convertSRGBToLinear?.() || new THREE.Color(colors[2]) },
      uDensity1: { value: densities[0] ?? 0.5 },
      uDensity2: { value: densities[1] ?? 0.35 },
      uDensity3: { value: densities[2] ?? 0.25 },
      uBrightness: { value: brightness },
      uNoiseScale: { value: noiseScale },
      uTimeScale: { value: timeScale },
      uWarpAmp: { value: warpAmp },
      uDensityBoost: { value: densityBoost },
      uMotionBoost: { value: motionBoost },
    }),
    []
  );

  React.useEffect(() => {
    const c1 = new THREE.Color(colors[0]);
    const c2 = new THREE.Color(colors[1]);
    const c3 = new THREE.Color(colors[2]);
    uniforms.uColor1.value.copy(c1.convertSRGBToLinear?.() || c1);
    uniforms.uColor2.value.copy(c2.convertSRGBToLinear?.() || c2);
    uniforms.uColor3.value.copy(c3.convertSRGBToLinear?.() || c3);
    uniforms.uDensity1.value = densities[0] ?? 0.5;
    uniforms.uDensity2.value = densities[1] ?? 0.35;
    uniforms.uDensity3.value = densities[2] ?? 0.25;
    uniforms.uBrightness.value = brightness;
    uniforms.uNoiseScale.value = noiseScale;
    uniforms.uTimeScale.value = timeScale;
    uniforms.uWarpAmp.value = warpAmp;
    uniforms.uDensityBoost.value = densityBoost;
    uniforms.uMotionBoost.value = motionBoost;
  }, [colors, densities, brightness, noiseScale, timeScale, warpAmp, densityBoost, motionBoost]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    if (meshRef.current) {
      uniforms.uCamObj.value.copy(
        meshRef.current.worldToLocal(tmp.current.copy(state.camera.position))
      );
    }
    // Ensure a frame is rendered even if RN fast refresh toggled frameloop
    state.invalidate();
  });

  const vertexShader = `
    varying vec3 vPosObj;
    void main() {
      vPosObj = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform float uTime, uBrightness, uNoiseScale, uTimeScale, uWarpAmp;
    uniform float uDensityBoost, uMotionBoost;
    uniform vec3  uCamObj;
    uniform vec3  uColor1, uColor2, uColor3;
    uniform float uDensity1, uDensity2, uDensity3;
    varying vec3  vPosObj;

    float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){
      vec3 p=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(p+vec3(0,0,0)),hash(p+vec3(1,0,0)),f.x),
                     mix(hash(p+vec3(0,1,0)),hash(p+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(p+vec3(0,0,1)),hash(p+vec3(1,0,1)),f.x),
                     mix(hash(p+vec3(0,1,1)),hash(p+vec3(1,1,1)),f.x),f.y),f.z);
    }
    // fbm/ridged removed for mobile performance
    vec3 tangentProject(vec3 p, vec3 v){
      vec3 n = normalize(p);
      return normalize(v - n * max(0.0, dot(v, n)) + 1e-4);
    }

    float densityAt(vec3 p){
      float r = length(p);
      float atten = smoothstep(0.0, 0.06, 1.0 - r);
      vec3 wob = vec3(uTime*uTimeScale*0.15, uTime*uTimeScale*0.21, uTime*uTimeScale*0.11) * uMotionBoost;
      float seed = noise(p*3.2 + wob);
      vec3 warpSeed = vec3(seed, fract(seed*1.7), fract(seed*2.3));
      vec3 warp = tangentProject(p, warpSeed) * uWarpAmp;
      float s1 = noise((p+warp) * clamp(uNoiseScale, 2.0, 5.0));
      float s2 = noise((p+warp) * clamp(uNoiseScale*1.9, 2.0, 7.0));
      float shaped  = smoothstep(0.3, 0.85, mix(s1, s2, 0.45));
      float radial  = 1.0 - clamp(r, 0.0, 1.0);
      float sigma   = (0.55*radial + 0.45*shaped) + 0.12;
      return sigma * atten;
    }

    void main(){
      vec3 ro = uCamObj;
      vec3 pb = vPosObj;
      vec3 rd = normalize(pb - ro);
      float b = length(ro - rd * dot(ro, rd));
      float h2 = 1.0 - b*b;
      if (h2 <= 0.0) discard;

      float L  = 2.0 * sqrt(h2);
      float t1 = length(pb - ro);
      float t0 = t1 - L;

      float s0 = 0.1127016654;
      float s1 = 0.5;
      float s2 = 0.8872983346;

      vec3 p0 = ro + rd * (t0 + s0 * L);
      vec3 p1 = ro + rd * (t0 + s1 * L);
      vec3 p2 = ro + rd * (t0 + s2 * L);

      // Shared structural density
      float g0 = densityAt(p0);
      float g1 = densityAt(p1);
      float g2 = densityAt(p2);
      float gI = (g0 + 4.0*g1 + g2) * (L / 6.0);

      // Color-specific masks at slightly different scales (cheaper noise)
      vec3 wob = vec3(uTime*uTimeScale*0.07, uTime*uTimeScale*0.11, uTime*uTimeScale*0.05);
      float m10 = smoothstep(0.42, 0.92, noise(p0*2.6 + wob));
      float m11 = smoothstep(0.42, 0.92, noise(p1*2.6 + wob));
      float m12 = smoothstep(0.42, 0.92, noise(p2*2.6 + wob));
      float m1I = (m10 + 4.0*m11 + m12) * (L / 6.0);

      float m20 = smoothstep(0.44, 0.94, noise(p0*3.2 - wob.yzx));
      float m21 = smoothstep(0.44, 0.94, noise(p1*3.2 - wob.yzx));
      float m22 = smoothstep(0.44, 0.94, noise(p2*3.2 - wob.yzx));
      float m2I = (m20 + 4.0*m21 + m22) * (L / 6.0);

      float m30 = smoothstep(0.46, 0.96, noise(p0*4.0 + wob.zxy));
      float m31 = smoothstep(0.46, 0.96, noise(p1*4.0 + wob.zxy));
      float m32 = smoothstep(0.46, 0.96, noise(p2*4.0 + wob.zxy));
      float m3I = (m30 + 4.0*m31 + m32) * (L / 6.0);

      float i1 = gI * m1I * uDensity1;
      float i2 = gI * m2I * uDensity2;
      float i3 = gI * m3I * uDensity3;

      float integral = (i1 + i2 + i3) * uDensityBoost;
      float alpha = 1.0 - exp(-3.2 * integral);
      alpha = clamp(alpha, 0.0, 0.95);
      if (alpha < 0.003) discard;

      vec3 col = uColor1 * i1 + uColor2 * i2 + uColor3 * i3;
      col *= (uBrightness * 1.45);
      col = pow(col, vec3(0.9));
      // mild saturation lift
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.18);

      float dither = fract(sin(dot(gl_FragCoord.xy , vec2(12.9898,78.233))) * 43758.5453);
      alpha = clamp(alpha - dither*0.01, 0.0, 1.0);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  React.useEffect(() => {
    if (matRef.current) matRef.current.toneMapped = false;
  }, []);

  return (
    <mesh ref={meshRef} position={position} scale={scale * shellRadius} renderOrder={renderOrder}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest
        depthWrite={false}
        blending={blend === "add" ? THREE.AdditiveBlending : THREE.NormalBlending}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}
