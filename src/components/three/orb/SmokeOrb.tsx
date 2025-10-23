// @ts-nocheck
import { extend, ReactThreeFiber, useFrame, useLoader } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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
  opacity?: number;
};

export function SmokeOrb({
  colorA = "#8cf",
  colorB = "#fff",
  colorC = "#fff",
  scale = 0.92,
  opacity = 0.85,
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
      uZoom: { value: 0.88 },
      uOpacity: { value: opacity },
      uColorA: { value: resolvedColors.a.clone() },
      uColorB: { value: resolvedColors.b.clone() },
      uColorC: { value: resolvedColors.c.clone() },
    }),
    [texture, resolvedColors, opacity]
  );

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.up.set(0, 1, 0);
    }
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.lookAt(state.camera.position);
    }

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

      // Debug: log once per second
      if (__DEV__ && Math.floor(state.clock.getElapsedTime()) % 5 === 0 && state.clock.getElapsedTime() % 1 < 0.016) {
        console.log(
          "[SmokeOrb] Animation time:",
          state.clock.getElapsedTime().toFixed(2),
          "Frame:",
          Math.floor((state.clock.getElapsedTime() * 24) % 134)
        );
      }
    }
  });

  useEffect(() => {
    if (texture) {
      // Texture wrapping settings
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      // Disable mipmaps to prevent bleeding between atlas tiles
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      // Light anisotropy for quality
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
      matRef.current.uniforms.uOpacity.value = opacity;
    }
  }, [resolvedColors, opacity]);

  return (
    <mesh ref={meshRef} scale={scale} renderOrder={-1}>
      <planeGeometry args={[1.6, 1.6, 1, 1]} />
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
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            const float cols = 14.0;
            const float rows = 10.0;
            const float totalFrames = 134.0;
            const float fps = 16.0;

            float frame = mod(floor(uTime * fps), totalFrames);

            vec2 tileSize = vec2(1.0 / cols, 1.0 / rows);
            vec2 tileIndex = vec2(mod(frame, cols), floor(frame / cols));
            vec2 tileOffset = tileIndex * tileSize;

            vec2 zoomed = (vUv - 0.5) * uZoom + 0.5;
            if (any(lessThan(zoomed, vec2(0.0))) || any(greaterThan(zoomed, vec2(1.0)))) {
              discard;
            }

            vec2 border = (1.5 / uAtlasSize);
            vec2 tileUV = tileOffset + zoomed * (tileSize - border * 2.0) + border;
            tileUV.y = 1.0 - tileUV.y;

            vec4 texSample = texture2D(uSmokeAtlas, tileUV);
            float d = (texSample.r + texSample.g + texSample.b) / 3.0;

            vec2 centeredUv = zoomed * 2.0 - 1.0;
            float r = length(centeredUv);
            float edgeFade = smoothstep(0.85, 0.3, r);
            float rimMix = pow(edgeFade, 1.35);

            float normalized = clamp((d - 0.1) / 0.75, 0.0, 1.0);
            float density = pow(normalized, 0.6);
            float alpha = clamp(density * edgeFade * 1.45, 0.0, 1.0);

            vec3 color;
            if (density < 0.33) {
              color = mix(uColorA, uColorB, density / 0.33);
            } else if (density < 0.66) {
              color = mix(uColorB, uColorC, (density - 0.33) / 0.33);
            } else {
              color = mix(uColorC, uColorA, (density - 0.66) / 0.34);
            }

            // Keep color brightness, only fade alpha (so it looks white when fading out)
            vec3 brightColor = color * 1.5; // Boost brightness
            float finalAlpha = clamp(alpha * uOpacity, 0.0, 1.0);
            gl_FragColor = vec4(brightColor, finalAlpha);
          }
        `}
      />
    </mesh>
  );
}
