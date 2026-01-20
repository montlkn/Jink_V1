import { APP_COLORS } from "@/constants/appColors";
import { Canvas, useThree } from "@react-three/fiber/native";
import React, { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { useEnvMap } from "./env/envLoader";
import { RainbowLayer } from "./RainbowLayer";

const ENV = require("../../../../assets/env/qwantani_moon_noon_puresky_1080.jpg");

type Props = {
  size?: number;
  level: number;
  progress: number; // 0 to 1
  onPress?: () => void;
  tintColor?: string; // Optional tint color for multiplier mode
};

type OrbContentProps = {
  envAsset: any;
  tintColor?: string;
};

function OrbContent({ envAsset, tintColor }: OrbContentProps) {
  const materialRef = useRef<any>(null);
  const env = useEnvMap(envAsset);
  const { scene } = useThree();

  // Use tint color if provided, otherwise default gold
  const glassColor = tintColor || APP_COLORS.passport.list;
  const attenuationCol = tintColor || APP_COLORS.passport.list;

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
      {/* Static light rig - no gyro for performance */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 3]} intensity={6.0} />
      <directionalLight position={[-2, 1, -2]} intensity={5.0} />

      {/* Static orb - no gyro animation for small UI element */}
      <group>
        <RainbowLayer />

        {/* Outer glass shell - reduced poly count for performance */}
        <mesh renderOrder={10}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial
            ref={materialRef}
            color={glassColor}
            envMap={env || undefined}
            envMapIntensity={10}
            roughness={0.02}
            metalness={0.3}
            clearcoat={1}
            clearcoatRoughness={0.05}
            specularIntensity={5.0}
            specularColor={APP_COLORS.passport.list}
            reflectivity={1.0}
            opacity={0.35}
            transparent
            depthWrite={false}
            ior={1.5}
            transmission={0.35}
            thickness={1.0}
            attenuationDistance={1.2}
            attenuationColor={attenuationCol}
          />
        </mesh>
      </group>
    </>
  );
}

export default function XPGlassOrb({
  size = 70,
  tintColor,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 50 }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      // @ts-ignore - Pass multisample prop to underlying GLView
      multisample={false}
      frameloop="demand" // Static orb - only render when props change
      style={{ width: size, height: size, backgroundColor: "transparent" }}
      dpr={1} // Fixed DPR to avoid multisampling
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
      }}
    >
      <OrbContent
        envAsset={ENV}
        tintColor={tintColor}
      />
    </Canvas>
  );
}
