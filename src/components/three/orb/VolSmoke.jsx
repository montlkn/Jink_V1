import { useFrame } from "@react-three/fiber/native";
import React, { useRef, useMemo } from "react";
import * as THREE from "three";

/**
 * VolSmoke: Mobile-optimized volumetric smoke using alpha-blended sphere with animated noise
 *
 * NOTE: Full raymarching is too expensive for mobile. This uses a simpler approach:
 * - Renders back faces of a sphere
 * - Applies animated 3D noise in fragment shader
 * - Much cheaper than ray marching but still looks volumetric
 *
 * Props:
 * - color: THREE.Color or hex string
 * - density: 0..1 (controls opacity, default 0.5)
 * - brightness: 0..2+ (default 1.0)
 * - turbulence: 0..1 (controls noise animation speed, default 0.5)
 * - noiseScale: scale of noise pattern (default 3.0)
 * - shellRadius: visual size (default 0.98)
 * - renderOrder: render order (default 10)
 */
export default function VolSmoke({
  color = "#7CFF3B",
  density = 0.5,
  brightness = 1.0,
  turbulence = 0.5,
  noiseScale = 3.0,
  timeScale = 0.08,
  shellRadius = 0.98,
  renderOrder = 10,
  position = [0, 0, 0],
  scale = 1.0,
  // Perf/quality controls (wired from LOD presets)
  steps = 14,
  warpAmp = 0.10,
  useLite = false,
}) {
  const meshRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color(color).convertSRGBToLinear?.() || new THREE.Color(color) },
      uDensity: { value: density },
      uBrightness: { value: brightness },
      uTurbulence: { value: turbulence },
      uNoiseScale: { value: noiseScale },
      uTimeScale: { value: timeScale },
      uSteps: { value: steps },
      uWarpAmp: { value: warpAmp },
      uUseLite: { value: useLite ? 1.0 : 0.0 },
    }),
    []
  );

  // Update uniforms when props change
  React.useEffect(() => {
    if (uniforms.uColor.value) {
      const c = new THREE.Color(color);
      uniforms.uColor.value.copy(c.convertSRGBToLinear?.() || c);
    }
    uniforms.uDensity.value = density;
    uniforms.uBrightness.value = brightness;
    uniforms.uTurbulence.value = turbulence;
    uniforms.uNoiseScale.value = noiseScale;
    uniforms.uTimeScale.value = timeScale;
    uniforms.uSteps.value = steps;
    uniforms.uWarpAmp.value = warpAmp;
    uniforms.uUseLite.value = useLite ? 1.0 : 0.0;
  }, [color, density, brightness, turbulence, noiseScale, timeScale, steps, warpAmp, useLite, uniforms]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const vertexShader = `
    varying vec3 vPosObj;

    void main() {
      vPosObj = position;  // unit sphere in object space
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform float uTime, uDensity, uBrightness, uTurbulence, uNoiseScale, uTimeScale;
    uniform float uSteps, uWarpAmp, uUseLite;
    uniform vec3  uColor;
    varying vec3  vPosObj;

    float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){
      vec3 p=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(p+vec3(0,0,0)),hash(p+vec3(1,0,0)),f.x),
                     mix(hash(p+vec3(0,1,0)),hash(p+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(p+vec3(0,0,1)),hash(p+vec3(1,0,1)),f.x),
                     mix(hash(p+vec3(0,1,1)),hash(p+vec3(1,1,1)),f.x),f.y),f.z);
    }

    // Fractional Brownian Motion (few octaves for mobile)
    float fbm(vec3 p){
      float v=0.0, a=0.5;
      for(int i=0;i<3;i++){ v += a*noise(p); p = p*2.02 + 17.13; a *= 0.5; }
      return v;
    }
    // Ridged variant for sharper wisps
    float ridged(vec3 p){
      float f = fbm(p);
      return 1.0 - abs(2.0*f - 1.0);
    }

    vec3 adjustSaturation(vec3 c, float s){
      float l = dot(c, vec3(0.299,0.587,0.114));
      return mix(vec3(l), c, s);
    }

    void main(){
      // radial march from surface toward center (no inverse() needed)
      vec3 ro = vPosObj;
      vec3 rd = -normalize(vPosObj);

      // Beer-Lambert style accumulation with cheap step jitter to reduce banding
      float T = 1.0;         // transmittance
      vec3  col = vec3(0.0);

      // Animate domain separately so motion reads clearly
      vec3 wob = vec3(uTime*uTimeScale*0.10, uTime*uTimeScale*0.13, uTime*uTimeScale*0.07);

      const int MAX_STEPS = 16; // compile-time constant for mobile WebGL
      int STEPS = int(clamp(uSteps, 8.0, float(MAX_STEPS)));
      float stepLen = 0.06;
      float t = 0.0;
      for(int i=0;i<MAX_STEPS;i++){
        if(i >= STEPS) break;
        // tiny per-step jitter
        float jitter = (fract(sin((uTime + float(i))*123.45)*9876.54) - 0.5) * 0.01;
        vec3 p = ro + rd * t;
        if(dot(p,p)>1.0) break;

        // mild domain warp
        vec3 warp = vec3(
          noise(p*3.1 + wob),
          noise(p*3.7 - wob.yzx),
          noise(p*4.0 + wob.zxy)
        );
        vec3 pw = p + warp * uWarpAmp;

        float radial = 1.0 - clamp(length(p), 0.0, 1.0);
        float rfbm;
        float shaped;
        if(uUseLite > 0.5){
          // Lite path: fewer noise evals
          float n = noise(pw * clamp(uNoiseScale, 2.0, 5.0));
          rfbm = 1.0 - abs(2.0*n - 1.0);
          shaped = smoothstep(0.38, 0.82, rfbm);
        } else {
          rfbm   = ridged(pw * clamp(uNoiseScale, 2.0, 5.0));
          shaped = smoothstep(0.35, 0.85, mix(rfbm, fbm(pw*0.6), 0.25));
        }
        float sigma  = (0.55*radial + 0.45*shaped) * max(uDensity, 0.45);

        // accumulate with attenuation
        float absorb = sigma * stepLen;
        float contrib = T * absorb;
        col += uColor * contrib;
        T *= exp(-absorb);

        t += stepLen + jitter;
      }

      // Color grading: lift mids and small saturation push
      vec3 colorLin = col * max(uBrightness, 1.35);
      colorLin = pow(colorLin, vec3(0.9)); // lift mids
      vec3 finalColor = adjustSaturation(colorLin, 1.28);

      float alpha = clamp(1.0 - T, 0.0, 0.85);

      // Optional cheap alpha dither to hide banding
      float dither = fract(sin(dot(gl_FragCoord.xy , vec2(12.9898,78.233))) * 43758.5453);
      float aOut = clamp(max(alpha, 0.10) - (dither*0.01), 0.0, 1.0);
      gl_FragColor = vec4(finalColor, aOut);
    }
  `;

  // Create material ref to disable tone mapping
  const materialRef = useRef();

  React.useEffect(() => {
    if (materialRef.current) {
      materialRef.current.toneMapped = false;
    }
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      renderOrder={renderOrder}
    >
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        depthTest={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}
