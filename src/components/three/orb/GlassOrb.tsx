import { Canvas, useThree } from "@react-three/fiber/native";
import React, { useEffect, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, Color, Group, SRGBColorSpace } from "three";
import { useEnvMap } from "./env/envLoader";
import { GyroLightRig } from "./GyroLightRig";
import { RainbowLayer } from "./RainbowLayer";
import { SmokeOrb } from "./SmokeOrb";

const ENV = require("../../../../assets/env/qwantani_moon_noon_puresky_1k.png");

type Props = {
  size?: number;
  colorA?: string;
  colorB?: string;
  colorC?: string;
  palette?: Array<{ color: string; weight: number }>;
};

type OrbContentProps = {
  envAsset: any;
  tintColor: Color;
  colorA: string;
  colorB: string;
  colorC: string;
};

function OrbContent({ envAsset, tintColor, colorA, colorB, colorC }: OrbContentProps) {
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

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      "[GlassOrb] env isTexture:",
      !!(env as any)?.isTexture,
      "type:",
      env === null ? "null" : typeof env
    );
  }

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
        <SmokeOrb colorA={colorA} colorB={colorB} colorC={colorC} scale={0.92} />
        {/* Rainbow refraction layer - creates chromatic sparkles */}
        <RainbowLayer />
        {/* Outer glass shell */}
        <mesh>
          <sphereGeometry args={[1, 256, 256]} />
          <meshPhysicalMaterial
            ref={materialRef}
            color="#ffffff"
            envMap={env || undefined}
            envMapIntensity={8.5}
            roughness={0.04}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.06}
            specularIntensity={5.0}
            specularColor="#ffffff"
            reflectivity={1.0}
            opacity={0.28}
            transparent
            depthWrite={false}
            ior={1.5}
            transmission={0.68}
            thickness={0.65}
            attenuationDistance={1.5}
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
  palette,
}: Props) {
  const tintColor = useMemo(() => {
    if (palette && palette.length > 0) {
      const totalWeight = palette.reduce((sum, entry) => sum + Math.max(entry.weight ?? 0, 0), 0);
      const normalizer = totalWeight > 0 ? totalWeight : palette.length;
      const blended = palette.reduce((acc, entry) => {
        try {
          const ratio = Math.max(entry.weight ?? 0, 0) / normalizer;
          if (ratio <= 0) return acc;
          const sample = new Color(entry.color);
          acc.add(sample.multiplyScalar(ratio));
        } catch (error) {
          console.warn("[GlassOrb] Failed to apply palette color", entry, error);
        }
        return acc;
      }, new Color(0x000000));
      return blended;
    }

    // Fallback to supplied colors; blend evenly
    try {
      const base = new Color(colorA);
      base.add(new Color(colorB));
      base.add(new Color(colorC));
      base.multiplyScalar(1 / 3);
      return base;
    } catch (error) {
      console.warn("[GlassOrb] Failed to blend fallback colors", error);
      return new Color("#8cf");
    }
  }, [palette, colorA, colorB, colorC]);

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
      onCreated={({ gl }) => {
        // Patch renderbufferStorageMultisample BEFORE any other operations
        const ctx = gl.getContext() as any;
        if (ctx && ctx.renderbufferStorageMultisample) {
          ctx.renderbufferStorageMultisample = function(target: number, samples: number, internalformat: number, width: number, height: number) {
            // Expo GL doesn't support multisampling - fall back to single-sample
            console.warn('[GlassOrb] renderbufferStorageMultisample not supported, using renderbufferStorage fallback');
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
          console.log("[GlassOrb] isWebGL2:", renderer?.capabilities?.isWebGL2 ?? "unknown");
          console.log("[GlassOrb] EXT_color_buffer_float:", hasFloat);
          console.log("[GlassOrb] maxSamples:", renderer?.capabilities?.maxSamples ?? "unknown");
        }
      }}
    >
      <OrbContent
        envAsset={ENV}
        tintColor={tintColor}
        colorA={colorA}
        colorB={colorB}
        colorC={colorC}
      />
    </Canvas>
  );
}
