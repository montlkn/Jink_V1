import { Canvas, useThree } from "@react-three/fiber/native";
import React, { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, Group, SRGBColorSpace } from "three";
import { useEnvMap } from "./env/envLoader";
import { GyroLightRig } from "./GyroLightRig";
import { RainbowLayer } from "./RainbowLayer";
import { SmokeOrb } from "./SmokeOrb";

const ENV = require("../../../../assets/env/qwantani_moon_noon_puresky_1080.jpg");

type Props = {
  size?: number;
  colorA?: string;
  colorB?: string;
  colorC?: string;
  palette?: { color: string; weight: number }[];
  startupDuration?: number;
  transitionDuration?: number;
  onReady?: () => void;
  segments?: number; // Sphere resolution - lower for better performance on smaller orbs
  useHighResTextures?: boolean; // Whether to use high-res smoke textures - set false for smaller orbs
};

// Define OrbContentProps based on the Props type, adding envAsset and renaming onReady to onLoad
type OrbContentProps = {
  envAsset: any;
  colorA: string;
  colorB: string;
  colorC: string;
  startupDuration: number;
  transitionDuration: number;
  segments: number;
  useHighResTextures: boolean;
  onLoad?: () => void;
};

function OrbContent({ envAsset, colorA, colorB, colorC, startupDuration, transitionDuration, segments, useHighResTextures, onLoad }: OrbContentProps) {
  const envHolder = useRef<Group | null>(null);
  const lightGroup = useRef<Group | null>(null);
  const materialRef = useRef<any>(null);
  const env = useEnvMap(envAsset);
  const { scene } = useThree();

  // Feed PBR with the env once it exists
  useEffect(() => {
    if (env) {
      scene.environment = env;
      // Force material to recompile when env arrives
      if (materialRef.current) {
        materialRef.current.envMap = env;
        materialRef.current.needsUpdate = true;
      }
    }

    return () => {
      if (scene.environment === env) {
        scene.environment = null;
      }
    };
  }, [env, scene]);

  return (
    <>
      {/* Rotating light rig - controlled by gyroscope */}
      <group ref={lightGroup}>
        <GyroLightRig target={lightGroup} />
        <ambientLight intensity={1.0} />
        {/* Main key light - soft directional */}
        <directionalLight position={[-5, 0, -5]} intensity={3.0} />
        {/* Lens Flare Highlight - Point light for sharp star reflection */}
        {/* @ts-ignore */}
        <pointLight 
          position={[3, 3, 3]} 
          intensity={150.0} 
          distance={20}
          decay={2}
        />
      </group>

      {/* Rotating orb group */}
      <group ref={envHolder}>
        <GyroLightRig target={envHolder} />
        {/* Inner smoke sphere - renders first */}
        <SmokeOrb 
          colorA={colorA} 
          colorB={colorB} 
          colorC={colorC}
          scale={1.33} 
          startupDuration={startupDuration}
          transitionDuration={transitionDuration}
          useHighResTextures={useHighResTextures}
          onLoad={onLoad}
        />
        {/* Rainbow refraction layer - creates chromatic sparkles */}
        <RainbowLayer />
        {/* Outer glass shell - use dynamic segment count for performance */}
        <mesh renderOrder={10}>
          <sphereGeometry args={[1, segments, segments]} />
          <meshPhysicalMaterial
            ref={materialRef}
            color="#ffffff"
            envMap={env || undefined}
            envMapIntensity={5.0}
            roughness={0.02}
            metalness={0.2}
            clearcoat={0.0}
            clearcoatRoughness={0.0}
            specularIntensity={1.0}
            specularColor="#ffffff"
            reflectivity={1.0}
            opacity={1.0}
            transparent
            depthWrite={false}
            ior={1.8}
            transmission={1.0}
            thickness={2.0}
            attenuationDistance={5.0}
            attenuationColor="#ffffff"
          />
        </mesh>
      </group>
    </>
  );
}

function GlassOrbComponent({
  size = 350,
  colorA = "#8cf",
  colorB = "#fff",
  colorC = "#fff",
  startupDuration = 0,
  transitionDuration = 0,
  segments, // Allow manual override
  useHighResTextures, // Allow manual override
  onReady,
}: Props) {
  // Smart default: use lower resolution for smaller orbs (50% segments = 75% fewer polygons)
  const segmentCount = segments ?? (size < 300 ? 64 : 128);
  
  // Smart default: skip high-res textures for smaller orbs to save ~2MB memory
  const useHiRes = useHighResTextures ?? (size >= 300);

  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 50 }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
      // @ts-ignore - Pass multisample prop to underlying GLView
      multisample={false}
      frameloop="always"
      style={{
        width: size,
        height: size,
        backgroundColor: "transparent",
      }}
      dpr={1}
      onCreated={({ gl }: { gl: any }) => {
        // Patch renderbufferStorageMultisample BEFORE any other operations
        const ctx = gl.getContext() as any;
        if (ctx && ctx.renderbufferStorageMultisample) {
          ctx.renderbufferStorageMultisample = function(target: number, samples: number, internalformat: number, width: number, height: number) {
            // Expo GL doesn't support multisampling - fall back to single-sample
            return ctx.renderbufferStorage(target, internalformat, width, height);
          };
        }

        gl.setClearColor?.(0x000000, 0); // transparent
        gl.setClearAlpha?.(0);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;

        // Explicitly disable multisampling
        const renderer: any = gl;
        if (renderer.capabilities) {
          renderer.capabilities.maxSamples = 0;
        }

        renderer.autoClear = true;
        renderer.autoClearColor = true;
        renderer.autoClearDepth = true;
        renderer.autoClearStencil = true;

        // Signal ready
        if (onReady) {
            // Small delay to ensure first frame renders
            setTimeout(onReady, 100);
        }
      }}
    >
      <OrbContent
        envAsset={ENV}
        colorA={colorA}
        colorB={colorB}
        colorC={colorC}
        startupDuration={startupDuration}
        transitionDuration={transitionDuration}
        segments={segmentCount}
        useHighResTextures={useHiRes}
        onLoad={onReady}
      />
    </Canvas>
  );
}

// Memoize to prevent unnecessary remounts when parent re-renders
const GlassOrb = React.memo(GlassOrbComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return (
    prevProps.size === nextProps.size &&
    prevProps.colorA === nextProps.colorA &&
    prevProps.colorB === nextProps.colorB &&
    prevProps.colorC === nextProps.colorC &&
    prevProps.segments === nextProps.segments &&
    prevProps.useHighResTextures === nextProps.useHighResTextures &&
    prevProps.startupDuration === nextProps.startupDuration &&
    prevProps.transitionDuration === nextProps.transitionDuration
    // Note: onReady intentionally excluded - function identity changes shouldn't cause remount
  );
});

export default GlassOrb;
