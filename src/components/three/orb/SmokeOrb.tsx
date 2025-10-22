// @ts-nocheck
import { extend, ReactThreeFiber, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { Color, ShaderMaterial, TextureLoader, Vector2 } from "three";

const SMOKE_ATLAS = require("../../../../assets/textures/smoke_atlas.png");

extend({ ShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      shaderMaterial: ReactThreeFiber.Object3DNode<ShaderMaterial, typeof ShaderMaterial>;
    }
  }
}

type Props = {
  colorA?: string;
  colorB?: string;
  colorC?: string;
  scale?: number;
};

export function SmokeOrb({
  colorA = "#8cf",
  colorB = "#fff",
  colorC = "#fff",
  scale = 0.92,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(TextureLoader, SMOKE_ATLAS);
  const resolvedColors = useMemo(() => {
    try {
      return {
        a: new Color(colorA),
        b: new Color(colorB),
        c: new Color(colorC),
      };
    } catch (error) {
      console.warn("[SmokeOrb] Failed to parse colors", { colorA, colorB, colorC }, error);
      return {
        a: new Color("#8cf"),
        b: new Color("#fff"),
        c: new Color("#fff"),
      };
    }
  }, [colorA, colorB, colorC]);

  const uniforms = useMemo(
    () => ({
      uSmokeAtlas: { value: texture },
      uTime: { value: 0 },
      uAtlasSize: { value: new Vector2(2048, 2048) },
      uZoom: { value: 0.65 },
      uColorA: { value: resolvedColors.a.clone() },
      uColorB: { value: resolvedColors.b.clone() },
      uColorC: { value: resolvedColors.c.clone() },
    }),
    [texture, resolvedColors]
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(state.camera.quaternion);
    }

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

      // Debug: log once per second
      if (__DEV__ && Math.floor(state.clock.getElapsedTime()) % 5 === 0 && state.clock.getElapsedTime() % 1 < 0.016) {
        console.log(
          "[SmokeOrb] Animation time:",
          state.clock.getElapsedTime().toFixed(2),
          "Frame:",
          Math.floor((state.clock.getElapsedTime() * 6) % 64)
        );
      }
    }
  });

  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      const maxAniso = (texture as any)?.manager?.renderer?.capabilities?.getMaxAnisotropy?.() ?? 4;
      texture.anisotropy = Math.min(maxAniso, 2);
      texture.needsUpdate = true;

      if (matRef.current && texture.image?.width && texture.image?.height) {
        matRef.current.uniforms.uAtlasSize.value.set(texture.image.width, texture.image.height);
      }

      if (__DEV__) {
        console.log('[SmokeOrb] Texture loaded:', {
          width: texture.image?.width,
          height: texture.image?.height,
          format: texture.format,
          type: texture.type,
        });
      }
    }
  }, [texture]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColorA.value.copy(resolvedColors.a);
      matRef.current.uniforms.uColorB.value.copy(resolvedColors.b);
      matRef.current.uniforms.uColorC.value.copy(resolvedColors.c);
    }
  }, [resolvedColors]);

  return (
    <mesh ref={meshRef} scale={scale} renderOrder={-1}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        depthTest={false}
        side={THREE.DoubleSide}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D uSmokeAtlas;
          uniform float uTime;
          uniform vec2 uAtlasSize;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          uniform float uZoom;
          varying vec2 vUv;

          vec4 sampleFrame(float frame, vec2 tile, vec2 localUv) {
            const float cols = 8.0;
            float fx = mod(frame, cols);
            float fy = floor(frame / cols);
            vec2 uv = localUv + vec2(fx, fy) * tile;
            return texture2D(uSmokeAtlas, uv);
          }

          void main() {
            const float cols = 8.0;
            const float rows = 8.0;
            const float total = 64.0;
            const float fps = 6.0;

            float frame = floor(mod(uTime * fps, total));
            float blend = fract(uTime * fps);

            vec2 tile = vec2(1.0 / cols, 1.0 / rows);
            vec2 pixel = 1.0 / uAtlasSize;
            vec2 gutter = pixel * 1.5;
            vec2 zoomed = (vUv - 0.5) * uZoom + 0.5;

            if (any(lessThan(zoomed, vec2(0.0))) || any(greaterThan(zoomed, vec2(1.0)))) {
              discard;
            }

            vec2 localUv = zoomed * (tile - gutter * 2.0) + gutter;

            vec4 texSample = mix(
              sampleFrame(frame, tile, localUv),
              sampleFrame(mod(frame + 1.0, total), tile, localUv),
              blend
            );

            float d = (texSample.r + texSample.g + texSample.b) / 3.0;

            vec2 centeredUv = zoomed * 2.0 - 1.0;
            float radial = length(centeredUv);
            float edgeFade = 1.0 - smoothstep(0.76, 0.98, radial);

            float normalized = clamp((d - 0.1) / 0.8, 0.0, 1.0);
            float density = pow(normalized, 0.7);
            float alpha = clamp(density * edgeFade * 1.8, 0.0, 1.0);

            vec3 color;
            if (density < 0.33) {
              color = mix(uColorA, uColorB, density / 0.33);
            } else if (density < 0.66) {
              color = mix(uColorB, uColorC, (density - 0.33) / 0.33);
            } else {
              color = mix(uColorC, uColorA, (density - 0.66) / 0.34);
            }

            vec3 glow = color * (alpha * 1.3);
            gl_FragColor = vec4(glow, clamp(alpha, 0.0, 1.0));
          }
        `}
      />
    </mesh>
  );
}
