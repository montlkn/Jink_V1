import { Canvas, useThree } from "@react-three/fiber/native";
import React, { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, Group, SRGBColorSpace } from "three";
import { log } from "@/lib/log";
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
};

type OrbContentProps = {
  envAsset: any;
  colorA: string;
  colorB: string;
  colorC: string;
};

function OrbContent({ envAsset, colorA, colorB, colorC }: OrbContentProps) {
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
        log.debug(
          "[GlassOrb] Environment map loaded and applied to material"
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
      {/* Rotating light rig - controlled by gyroscope */}
      <group ref={lightGroup}>
        <GyroLightRig target={lightGroup} />
        <ambientLight intensity={0.4} />
        {/* Main key lights for sparkle highlights - very bright */}
        <directionalLight position={[2, 2, 3]} intensity={6.5} />
        <directionalLight position={[-3, 1, -2]} intensity={7.0} />
        {/* Additional accent lights for more sparkle variation */}
        {/* @ts-ignore - pointLight exists in R3F but types may be incomplete */}
        <pointLight position={[1.5, 1, 2]} intensity={3.0} distance={5} decay={2} />
        {/* @ts-ignore */}
        <pointLight position={[-1, -1.5, 2]} intensity={2.5} distance={5} decay={2} />
      </group>

      {/* Rotating orb group */}
      <group ref={envHolder}>
        <GyroLightRig target={envHolder} />
        {/* Inner smoke sphere - renders first */}
        <SmokeOrb colorA={colorA} colorB={colorB} colorC={colorC} scale={1.30} />
        {/* Rainbow refraction layer - creates chromatic sparkles */}
        <RainbowLayer />
        {/* Outer glass shell */}
        <mesh renderOrder={10}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshPhysicalMaterial
            ref={materialRef}
            color="#ffffff"
            envMap={env || undefined}
            envMapIntensity={12.0}
            roughness={0.02}
            metalness={0.35}
            clearcoat={1}
            clearcoatRoughness={0.04}
            specularIntensity={6.0}
            specularColor="#ffffff"
            reflectivity={1.0}
            opacity={0.22}
            transparent
            depthWrite={false}
            ior={1.5}
            transmission={0.55}
            thickness={0.5}
            attenuationDistance={2.0}
            attenuationColor="#ffffff"
          />
        </mesh>
      </group>
    </>
  );
}

export default function GlassOrb({
  size = 350,
  colorA = "#8cf",
  colorB = "#fff",
  colorC = "#fff",
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
        console.log('[GlassOrb] created', {
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          canvasWidth: gl.canvas?.width,
          canvasHeight: gl.canvas?.height,
        });
        if (ctx && ctx.renderbufferStorageMultisample) {
          ctx.renderbufferStorageMultisample = function(target: number, samples: number, internalformat: number, width: number, height: number) {
            // Expo GL doesn't support multisampling - fall back to single-sample
            log.warn('[GlassOrb] renderbufferStorageMultisample not supported, using renderbufferStorage fallback');
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
          log.debug("[GlassOrb] isWebGL2:", renderer?.capabilities?.isWebGL2 ?? "unknown");
          log.debug("[GlassOrb] EXT_color_buffer_float:", hasFloat);
          log.debug("[GlassOrb] maxSamples:", renderer?.capabilities?.maxSamples ?? "unknown");
        }
      }}
    >
      <OrbContent
        envAsset={ENV}
        colorA={colorA}
        colorB={colorB}
        colorC={colorC}
      />
    </Canvas>
  );
}
