import React, { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber/native";
import { Group, SRGBColorSpace, ACESFilmicToneMapping } from "three";
import { GyroLightRig } from "./GyroLightRig";
import { useEnvMap } from "./env/envLoader";

const ENV = require("../../../../assets/env/studio_small_08_2k.jpg");

type Props = {
  size?: number;
};

function OrbContent({ envAsset }: { envAsset: any }) {
  const envHolder = useRef<Group | null>(null);
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
    <group ref={envHolder}>
      <GyroLightRig target={envHolder} />
      <mesh>
        <sphereGeometry args={[1, 128, 128]} />
        <meshPhysicalMaterial
          ref={materialRef}
          envMap={env || undefined}
          envMapIntensity={1.6}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.02}
          transmission={0}
          transparent
          opacity={0.18}
          ior={1.47}
        />
      </mesh>
    </group>
  );
}

export default function GlassOrb({ size = 220 }: Props) {
  return (
    <Canvas
      gl={{ alpha: true }}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      dpr={[1, 1.25]}
      onCreated={({ gl }) => {
        gl.setClearColor?.(0x000000, 0);   // transparent
        gl.setClearAlpha?.(0);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        if (__DEV__) {
          const renderer: any = gl;
          const ctx = renderer?.getContext?.();
          const hasFloat = ctx?.getExtension?.("EXT_color_buffer_float") ? "yes" : "no";
          console.log("[GlassOrb] isWebGL2:", renderer?.capabilities?.isWebGL2 ?? "unknown");
          console.log("[GlassOrb] EXT_color_buffer_float:", hasFloat);
        }
      }}
    >
      <OrbContent envAsset={ENV} />
    </Canvas>
  );
}
