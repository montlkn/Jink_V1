import { log } from "@/lib/log";
import {
    extend,
    ReactThreeFiber,
    useFrame,
    useLoader,
} from "@react-three/fiber/native";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Color, ShaderMaterial, Texture, Vector2 } from "three";

import { TextureLoader as ExpoTextureLoader } from "expo-three";

// Low-res textures for instant loading
const SMOKE_ATLAS_LOWRES = require("../../../../assets/textures/smoke_atlas_256.png");
const SMOKE_ATLAS_STARTUP_LOWRES = require("../../../../assets/textures/smoke_atlas_startup_256.png");

// High-res textures for quality upgrade
const SMOKE_ATLAS_HIRES = require("../../../../assets/textures/smoke_atlas_512.png");
const SMOKE_ATLAS_STARTUP_HIRES = require("../../../../assets/textures/smoke_atlas_startup_512.png");
extend({ ShaderMaterial });

const getTextureDimensions = (texture: Texture | null | undefined) => {
  const image = texture?.image as { width?: number; height?: number } | undefined;
  return {
    width: image?.width ?? 0,
    height: image?.height ?? 0,
  };
};



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
  animationSpeed?: number; // Multiplier for animation speed (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
  startupAtlasCols?: number; // Number of columns in startup atlas
  startupAtlasRows?: number; // Number of rows in startup atlas
  startupAtlasTotalFrames?: number; // Total frames in startup atlas
  startupDuration?: number; // Duration of startup animation in seconds
  transitionDuration?: number; // Duration of crossfade transition in seconds
  useHighResTextures?: boolean; // Whether to load high-res (512px) textures - set false for smaller orbs to save memory
  onLoad?: () => void;
};

export function SmokeOrb({
  colorA = "#8cf",
  colorB = "#fff",
  colorC = "#fff",
  scale = 0.92,
  opacity = 0.85,
  animationSpeed = 0.10,
  startupAtlasCols = 14,
  startupAtlasRows = 10,
  startupAtlasTotalFrames = 134,
  startupDuration = 3.0, // Startup animation duration in seconds
  transitionDuration = 1.0, // How long to crossfade between startup and loop
  useHighResTextures = true, // Default to high-res for backward compatibility
  onLoad,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const mountTimeRef = useRef<number>(performance.now());  // Track mount time

  // Log mount time for performance tracking
  useEffect(() => {
    const mountStart = mountTimeRef.current;
    const mountEnd = performance.now();
    const texturesLoadEnd = performance.now();
    
    log.info('[SmokeOrb] Component mounted', { 
      mountTime: `${(mountEnd - mountStart).toFixed(1)}ms`,
      texturesLoadTime: `${(texturesLoadEnd - mountStart).toFixed(1)}ms`,
      usingHighRes: useHighResTextures
    });
    
    if (onLoad) {
      onLoad();
    }

    return () => {
      log.info('[SmokeOrb] Component unmounting');
    };
  }, [onLoad, useHighResTextures]);

  // Progressive loading: Start with low-res for instant display
  const [loopTextureHiRes, setLoopTextureHiRes] = useState<Texture | null>(null);
  const [startupTextureHiRes, setStartupTextureHiRes] = useState<Texture | null>(null);
  
  // Load low-res textures immediately (blocks component mount, but fast)
  const loopTextureLowRes = useLoader(ExpoTextureLoader, SMOKE_ATLAS_LOWRES, (loader) => {
    log.info('[SmokeOrb] Loaded low-res loop texture (256px) - displaying now');
    loader.crossOrigin = 'anonymous';
  });
  
  const startupTextureLowRes = useLoader(ExpoTextureLoader, SMOKE_ATLAS_STARTUP_LOWRES, (loader) => {
    log.info('[SmokeOrb] Loaded low-res startup texture (256px) - displaying now');
    loader.crossOrigin = 'anonymous';
  });

  // Load high-res textures asynchronously in background - ONLY if useHighResTextures is true
  useEffect(() => {
    if (!useHighResTextures) {
      log.info('[SmokeOrb] Skipping high-res texture load (useHighResTextures=false) - staying at 256px for better performance');
      return;
    }

    log.info('[SmokeOrb] Starting background load of high-res textures (512px)');
    const loader = new ExpoTextureLoader();
    
    // Load loop texture
    loader.load(
      SMOKE_ATLAS_HIRES,
      (texture) => {
        log.info('[SmokeOrb] High-res loop texture loaded, upgrading quality');
        setLoopTextureHiRes(texture);
      },
      undefined,
      (error) => {
        log.warn('[SmokeOrb] Failed to load high-res loop texture:', error);
      }
    );
    
    // Load startup texture
    loader.load(
      SMOKE_ATLAS_STARTUP_HIRES,
      (texture) => {
        log.info('[SmokeOrb] High-res startup texture loaded, upgrading quality');
        setStartupTextureHiRes(texture);
      },
      undefined,
      (error) => {
        log.warn('[SmokeOrb] Failed to load high-res startup texture:', error);
      }
    );
  }, [useHighResTextures]);

  // Use low-res initially, upgrade to high-res when available
  const loopTexture = loopTextureHiRes || loopTextureLowRes;
  const startupTexture = startupTextureHiRes || startupTextureLowRes;

  const resolvedColors = useMemo(() => {
    try {
      return {
        a: new Color(colorA),
        b: new Color(colorB),
        c: new Color(colorC),
      };
    } catch (error) {
      log.warn("[SmokeOrb] Failed to parse colors", { colorA, colorB, colorC }, error);
      return {
        a: new Color("#8cf"),
        b: new Color("#fff"),
        c: new Color("#fff"),
      };
    }
  }, [colorA, colorB, colorC]);

  const uniforms = useMemo(
    () => ({
      uSmokeAtlas: { value: loopTexture },
      uStartupAtlas: { value: startupTexture },
      uTime: { value: 0 },
      uAtlasSize: { value: new Vector2(2048, 2048) },
      uStartupAtlasSize: { value: new Vector2(2048, 2048) },
      uZoom: { value: 0.88 },
      uOpacity: { value: opacity },
      uAnimationSpeed: { value: animationSpeed },
      uStartupAtlasCols: { value: startupAtlasCols },
      uStartupAtlasRows: { value: startupAtlasRows },
      uStartupAtlasTotalFrames: { value: startupAtlasTotalFrames },
      uStartupDuration: { value: startupDuration },
      uTransitionDuration: { value: transitionDuration },
      uColorA: { value: resolvedColors.a.clone() },
      uColorB: { value: resolvedColors.b.clone() },
      uColorC: { value: resolvedColors.c.clone() },
    }),
    [
      loopTexture,
      startupTexture,
      resolvedColors,
      opacity,
      animationSpeed,
      startupAtlasCols,
      startupAtlasRows,
      startupAtlasTotalFrames,
      startupDuration,
      transitionDuration,
    ]
  );

  const loopOffset = useMemo(() => Math.random() * 1000, []);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uLoopOffset = { value: loopOffset };
    }
  }, [loopOffset]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.up.set(0, 1, 0);
    }
  }, []);

  useEffect(() => {
    hasInitializedRef.current = false;
    startTimeRef.current = null;
  }, [loopTexture, startupTexture, startupDuration, transitionDuration]);

  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }

    if (!matRef.current) {
      return;
    }

    const texturesReady =
      getTextureDimensions(loopTexture).width > 0 &&
      getTextureDimensions(startupTexture).width > 0;

    if (!texturesReady) {
      // Wait until both atlases have loaded before starting timeline
      return;
    }

    if (!hasInitializedRef.current) {
      startTimeRef.current = Date.now();
      hasInitializedRef.current = true;
    }

    if (startTimeRef.current !== null) {
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      matRef.current.uniforms.uTime.value = elapsedTime;
    }
  });

  useEffect(() => {
    if (!loopTexture) {
      return;
    }

    const texture = loopTexture;

    // Texture wrapping settings
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Disable mipmaps to prevent bleeding between atlas tiles
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    // Note: Anisotropy removed - not supported in expo-gl (causes pixelStorei warnings)
    // texture.anisotropy setting would trigger 50+ console warnings

    texture.needsUpdate = true;

    if (matRef.current && texture.image?.width && texture.image?.height) {
      matRef.current.uniforms.uAtlasSize.value.set(texture.image.width, texture.image.height);
    }
  }, [loopTexture]);

  useEffect(() => {
    if (startupTexture) {
      // Same texture settings for startup atlas
      startupTexture.wrapS = THREE.ClampToEdgeWrapping;
      startupTexture.wrapT = THREE.ClampToEdgeWrapping;
      startupTexture.minFilter = THREE.LinearFilter;
      startupTexture.magFilter = THREE.LinearFilter;
      startupTexture.generateMipmaps = false;

      // Anisotropy removed for React Native compatibility

      startupTexture.needsUpdate = true;

      if (matRef.current && startupTexture.image?.width && startupTexture.image?.height) {
        matRef.current.uniforms.uStartupAtlasSize.value.set(
          startupTexture.image.width,
          startupTexture.image.height
        );
      }
    }
  }, [startupTexture]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColorA.value.copy(resolvedColors.a);
      matRef.current.uniforms.uColorB.value.copy(resolvedColors.b);
      matRef.current.uniforms.uColorC.value.copy(resolvedColors.c);
      matRef.current.uniforms.uOpacity.value = opacity;
    }
  }, [resolvedColors, opacity]);

  return (
    <mesh ref={meshRef} scale={scale} renderOrder={1}>
      <planeGeometry args={[1.6, 1.6, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        depthTest={true}
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
          uniform sampler2D uStartupAtlas;
          uniform float uTime;
          uniform vec2 uAtlasSize;
          uniform vec2 uStartupAtlasSize;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          uniform float uZoom;
          uniform float uOpacity;
          uniform float uAnimationSpeed;
          uniform float uStartupAtlasCols;
          uniform float uStartupAtlasRows;
          uniform float uStartupAtlasTotalFrames;
          uniform float uStartupDuration;
          uniform float uTransitionDuration;
          uniform float uLoopOffset;
          varying vec2 vUv;

          vec4 sampleAtlas(sampler2D atlas, float frameFloat, float cols, float rows, float totalFrames, vec2 atlasSize, vec2 zoomed) {
            float frame1 = mod(floor(frameFloat), totalFrames);
            float frame2 = mod(floor(frameFloat) + 1.0, totalFrames);
            float frameMix = fract(frameFloat);

            vec2 tileSize = vec2(1.0 / cols, 1.0 / rows);

            // Sample first frame
            vec2 tileIndex1 = vec2(mod(frame1, cols), floor(frame1 / cols));
            vec2 tileOffset1 = tileIndex1 * tileSize;

            vec2 border = (1.5 / atlasSize);
            vec2 tileUV1 = tileOffset1 + zoomed * (tileSize - border * 2.0) + border;
            tileUV1.y = 1.0 - tileUV1.y;

            vec4 texSample1 = texture2D(atlas, tileUV1);

            // Sample second frame
            vec2 tileIndex2 = vec2(mod(frame2, cols), floor(frame2 / cols));
            vec2 tileOffset2 = tileIndex2 * tileSize;
            vec2 tileUV2 = tileOffset2 + zoomed * (tileSize - border * 2.0) + border;
            tileUV2.y = 1.0 - tileUV2.y;

            vec4 texSample2 = texture2D(atlas, tileUV2);

            // Blend between the two frames
            return mix(texSample1, texSample2, frameMix);
          }

          void main() {
          const float loopCols = 14.0;
          const float loopRows = 10.0;
          const float loopTotalFrames = 134.0;
          const float startupFps = 24.0;
          const float loopFps = 24.0;
          float startupPlaybackSpeed = max(uAnimationSpeed, 0.01);
          float startupFramesShown = min(uStartupDuration * startupFps * startupPlaybackSpeed, uStartupAtlasTotalFrames - 1.0);

          vec2 zoomed = (vUv - 0.5) * uZoom + 0.5;
          if (any(lessThan(zoomed, vec2(0.0))) || any(greaterThan(zoomed, vec2(1.0)))) {
            discard;
          }

            // Determine which phase we're in
            float transitionStart = uStartupDuration;
            float transitionEnd = uStartupDuration + uTransitionDuration;

            vec4 texSample;

            if (uTime < transitionStart) {
              // Phase 1: Only startup animation (plays once)
              float startupFrameFloat = min(uTime * startupFps * startupPlaybackSpeed, startupFramesShown);
              texSample = sampleAtlas(uStartupAtlas, startupFrameFloat, uStartupAtlasCols, uStartupAtlasRows, uStartupAtlasTotalFrames, uStartupAtlasSize, zoomed);
            } else if (uTime < transitionEnd) {
              // Phase 2: Crossfade from startup to loop
              float transitionProgress = (uTime - transitionStart) / uTransitionDuration;
              transitionProgress = smoothstep(0.0, 1.0, clamp(transitionProgress, 0.0, 1.0));

              // Sample startup (hold on last frame)
              float startupHoldFrame = startupFramesShown;
              vec4 startupSample = sampleAtlas(uStartupAtlas, startupHoldFrame, uStartupAtlasCols, uStartupAtlasRows, uStartupAtlasTotalFrames, uStartupAtlasSize, zoomed);

              // Sample loop (start from beginning)
              float loopFrameFloat = mod((uTime + uLoopOffset) * loopFps * uAnimationSpeed, loopTotalFrames);
              vec4 loopSample = sampleAtlas(uSmokeAtlas, loopFrameFloat, loopCols, loopRows, loopTotalFrames, uAtlasSize, zoomed);

              // Crossfade
              texSample = mix(startupSample, loopSample, transitionProgress);
            } else {
              // Phase 3: Only loop animation
              float loopFrameFloat = mod((uTime + uLoopOffset) * loopFps * uAnimationSpeed, loopTotalFrames);
              vec4 loopSample = sampleAtlas(uSmokeAtlas, loopFrameFloat, loopCols, loopRows, loopTotalFrames, uAtlasSize, zoomed);
              texSample = loopSample;
            }

            float d = (texSample.r + texSample.g + texSample.b) / 3.0;

            vec2 centeredUv = zoomed * 2.0 - 1.0;
            float r = length(centeredUv);
            float rim = smoothstep(0.35, 0.85, r);
            float edgeFade = 1.0 - rim;
            float rimMix = pow(rim, 1.35);

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
            vec3 brightColor = color * 1.25;
            float finalAlpha = clamp(alpha * uOpacity, 0.0, 1.0);
            gl_FragColor = vec4(brightColor, finalAlpha);
          }
        `}
      />
    </mesh>
  );
}
