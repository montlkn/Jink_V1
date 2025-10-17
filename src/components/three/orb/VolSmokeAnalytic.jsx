import { useFrame } from "@react-three/fiber/native";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export default function VolSmokeAnalytic({
  color = "#7CFF3B",
  density = 0.55,
  brightness = 1.25,
  noiseScale = 3.0,
  timeScale = 0.40,
  warpAmp = 0.10,
  shellRadius = 0.98,
  renderOrder = 10,
  position = [0, 0, 0],
  scale = 1.0,
}) {
  const meshRef = useRef();
  const matRef = useRef();
  const tmp = useRef(new THREE.Vector3());

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamObj: { value: new THREE.Vector3(0, 0, 5) },
      uColor: {
        value:
          new THREE.Color(color).convertSRGBToLinear?.() || new THREE.Color(color),
      },
      uDensity: { value: density },
      uBrightness: { value: brightness },
      uNoiseScale: { value: noiseScale },
      uTimeScale: { value: timeScale },
      uWarpAmp: { value: warpAmp },
    }),
    []
  );

  React.useEffect(() => {
    const c = new THREE.Color(color);
    uniforms.uColor.value.copy(c.convertSRGBToLinear?.() || c);
    uniforms.uDensity.value = density;
    uniforms.uBrightness.value = brightness;
    uniforms.uNoiseScale.value = noiseScale;
    uniforms.uTimeScale.value = timeScale;
    uniforms.uWarpAmp.value = warpAmp;
  }, [color, density, brightness, noiseScale, timeScale, warpAmp]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    if (meshRef.current) {
      uniforms.uCamObj.value.copy(
        meshRef.current.worldToLocal(tmp.current.copy(state.camera.position))
      );
    }
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

    uniform float uTime, uDensity, uBrightness, uNoiseScale, uTimeScale, uWarpAmp;
    uniform vec3  uColor, uCamObj;
    varying vec3  vPosObj;

    float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){
      vec3 p=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(p+vec3(0,0,0)),hash(p+vec3(1,0,0)),f.x),
                     mix(hash(p+vec3(0,1,0)),hash(p+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(p+vec3(0,0,1)),hash(p+vec3(1,0,1)),f.x),
                     mix(hash(p+vec3(0,1,1)),hash(p+vec3(1,1,1)),f.x),f.y),f.z);
    }
    float fbm(vec3 p){
      float v=0.0, a=0.5;
      for(int i=0;i<3;i++){ v += a*noise(p); p = p*2.02 + 17.13; a *= 0.5; }
      return v;
    }
    float ridged(vec3 p){
      float f = fbm(p);
      return 1.0 - abs(2.0*f - 1.0);
    }

    vec3 tangentProject(vec3 p, vec3 v){
      vec3 n = normalize(p);
      return normalize(v - n * max(0.0, dot(v, n)) + 1e-4);
    }

    float densityAt(vec3 p){
      float r = length(p);
      float atten = smoothstep(0.0, 0.06, 1.0 - r);

      vec3 wob = vec3(uTime*uTimeScale*0.10, uTime*uTimeScale*0.13, uTime*uTimeScale*0.07);
      vec3 warpSeed = vec3(noise(p*3.1 + wob), noise(p*3.7 - wob.yzx), noise(p*4.0 + wob.zxy));
      vec3 warp = tangentProject(p, warpSeed) * uWarpAmp;

      float nRidged = ridged((p + warp) * clamp(uNoiseScale, 2.0, 5.0));
      float shaped  = smoothstep(0.35, 0.85, mix(nRidged, fbm((p+warp)*0.6), 0.25));

      float radial  = 1.0 - clamp(r, 0.0, 1.0);
      float sigma   = (0.55*radial + 0.45*shaped) * max(uDensity, 0.35);
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

      float d0 = densityAt(p0);
      float d1 = densityAt(p1);
      float d2 = densityAt(p2);

      float integral = (d0 + 4.0*d1 + d2) * (L / 6.0);

      float alpha = 1.0 - exp(-1.75 * integral);
      alpha = clamp(alpha, 0.0, 0.85);
      if (alpha < 0.015) discard;

      vec3 col = uColor * (integral * uBrightness * 1.3);
      col = pow(col, vec3(0.9));

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
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

