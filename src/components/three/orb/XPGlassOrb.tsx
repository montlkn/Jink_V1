import { Canvas, useThree } from "@react-three/fiber/native";
import React, { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, Group, SRGBColorSpace } from "three";
import { useEnvMap } from "./env/envLoader";
import { GyroLightRig } from "./GyroLightRig";
import { RainbowLayer } from "./RainbowLayer";

const ENV = require("../../../../assets/env/qwantani_moon_noon_puresky_1080.jpg");

type Props = {
  size?: number;
  level: number;
  progress: number; // 0 to 1
  onPress?: () => void;
};

type OrbContentProps = {
  envAsset: any;
};

function OrbContent({ envAsset }: OrbContentProps) {
  const envHolder = useRef<Group | null>(null);
  const lightGroup = useRef<Group | null>(null);
  const materialRef = useRef<any>(null);
  const env = useEnvMap(envAsset);
  const { scene } = useThree();
  const hasLoggedEnv = useRef(false);

  // Feed PBR with the env once it exists
  useEffect(() => {
    if (env) {
      scene.environment = env;
      // Force material to recompile when env arrives
      if (materialRef.current) {
        materialRef.current.envMap = env;
        materialRef.current.needsUpdate = true;
      }

      if (__DEV__ && !hasLoggedEnv.current) {
        hasLoggedEnv.current = true;
        console.log(
          "[XPGlassOrb] Environment map loaded and applied to material"
        );
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
      {/* Rotating light rig - controlled by gyroscope with extended range */}
      <group ref={lightGroup}>
        <GyroLightRig target={lightGroup} maxRadians={0.9} />
        <ambientLight intensity={0.35} />
        {/* Main key lights for sparkle highlights */}
        <directionalLight position={[2, 2, 3]} intensity={7.5} />
        <directionalLight position={[-3, 1, -2]} intensity={8.0} />
        {/* Additional accent lights keep core sparkle but leave room for gyro contrast */}
        {/* @ts-ignore - pointLight exists in R3F but types may be incomplete */}
        <pointLight position={[1.5, 1, 2]} intensity={5.0} distance={5} decay={2} />
        {/* @ts-ignore */}
        <pointLight position={[-1, -1.5, 2]} intensity={4.5} distance={5} decay={2} />
        {/* @ts-ignore - Extra colored lights for rainbow effect */}
        <pointLight position={[0, 2, 1]} intensity={3.0} distance={4} decay={2} color="#FF69B4" />
        {/* @ts-ignore */}
        <pointLight position={[0, -2, 1]} intensity={3.0} distance={4} decay={2} color="#00CED1" />
      </group>

      {/* Rotating orb group with extended gyro range */}
      <group ref={envHolder}>
        <GyroLightRig target={envHolder} maxRadians={0.9} />
        {/* Rainbow refraction layer - reuse main orb shaders for identical look */}
        <RainbowLayer />

        {/* Outer glass shell */}
        <mesh renderOrder={10}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshPhysicalMaterial
            ref={materialRef}
            color="#FFD700"
            envMap={env || undefined}
            envMapIntensity={13.5}
            roughness={0.015}
            metalness={0.35}
            clearcoat={1}
            clearcoatRoughness={0.03}
            specularIntensity={7.0}
            specularColor="#ffe9b3"
            reflectivity={1.0}
            opacity={0.32}
            transparent
            depthWrite={false}
            ior={1.58}
            transmission={0.4}
            thickness={1.1}
            attenuationDistance={1.15}
            attenuationColor="#FFD37A"
          />
        </mesh>
      </group>
    </>
  );
}

export default function XPGlassOrb({
  size = 70,
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
      frameloop="always"
      style={{ width: size, height: size, backgroundColor: "transparent" }}
      dpr={1} // Fixed DPR to avoid multisampling
      onCreated={({ gl }: { gl: any }) => {
        // Patch renderbufferStorageMultisample BEFORE any other operations
        const ctx = gl.getContext() as any;
        if (ctx && ctx.renderbufferStorageMultisample) {
          ctx.renderbufferStorageMultisample = function(target: number, samples: number, internalformat: number, width: number, height: number) {
            // Expo GL doesn't support multisampling - fall back to single-sample
            console.warn('[XPGlassOrb] renderbufferStorageMultisample not supported, using renderbufferStorage fallback');
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

        if (__DEV__) {
          const hasFloat = ctx?.getExtension?.("EXT_color_buffer_float") ? "yes" : "no";
          console.log("[XPGlassOrb] isWebGL2:", renderer?.capabilities?.isWebGL2 ?? "unknown");
          console.log("[XPGlassOrb] EXT_color_buffer_float:", hasFloat);
          console.log("[XPGlassOrb] maxSamples:", renderer?.capabilities?.maxSamples ?? "unknown");
        }
      }}
    >
      <OrbContent
        envAsset={ENV}
      />
    </Canvas>
  );
}
