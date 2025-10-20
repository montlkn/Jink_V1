import { useThree } from "@react-three/fiber/native";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const ENABLE_PMREM = false;

/**
 * envLoader: Utilities for loading and managing environment maps in React Native GL
 *
 * PMREM (Prefiltered Mipmapped Radiance Environment Map) provides stable,
 * performant reflections on mobile devices.
 */

/**
 * Hook to load and return an environment map
 * Falls back to null if loading fails (component should handle this gracefully)
 */
export function useEnvMap(): THREE.Texture | null {
  const { gl } = useThree();
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);
  const attemptedRef = useRef(false);
  const shouldGenerate = ENABLE_PMREM;

  useEffect(() => {
    if (!shouldGenerate) {
      if (attemptedRef.current === false) {
        attemptedRef.current = true;
      }
      return;
    }

    if (!gl || attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;

    const supportsPMREM =
      typeof gl?.getExtension === "function" &&
      (gl.getExtension("EXT_color_buffer_float") ||
        gl.getExtension("OES_texture_float") ||
        gl.getExtension("OES_texture_half_float"));

    if (!supportsPMREM) {
      console.warn("[envLoader] Falling back to lights; PMREM extensions unavailable");
      setEnvMap(null);
      return;
    }

    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let renderTarget: THREE.WebGLRenderTarget | null = null;

    try {
      pmremGenerator = new THREE.PMREMGenerator(gl);

      // Create a bright gradient environment scene
      const envScene = new THREE.Scene();

      // Bright gradient background (sky to horizon)
      envScene.background = new THREE.Color(0xccddff);

      // Add bright hemisphere light
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
      envScene.add(hemiLight);

      // Add multiple directional lights for varied reflections
      const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
      topLight.position.set(0, 10, 0);
      envScene.add(topLight);

      const frontLight = new THREE.DirectionalLight(0xeef4ff, 0.8);
      frontLight.position.set(5, 5, 10);
      envScene.add(frontLight);

      const sideLight = new THREE.DirectionalLight(0xffe4f4, 0.6);
      sideLight.position.set(-8, 3, -5);
      envScene.add(sideLight);

      // Generate PMREM from scene
      renderTarget = pmremGenerator.fromScene(envScene);
      setEnvMap(renderTarget.texture);

      console.log("[envLoader] Environment map created successfully");

      return () => {
        pmremGenerator?.dispose();
        renderTarget?.dispose();
      };
    } catch (error) {
      console.warn("[envLoader] Failed to create environment map:", error);
      setEnvMap(null);
      pmremGenerator?.dispose?.();
      renderTarget?.dispose?.();
    }
  }, [gl, shouldGenerate]);

  return shouldGenerate ? envMap : null;
}

/**
 * Alternative: Load environment from equirectangular image
 * (Requires expo-asset and proper image loading)
 */
export function useEnvMapFromEquirect(imageUri: string): THREE.Texture | null {
  const { gl } = useThree();
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!ENABLE_PMREM) {
      setEnvMap(null);
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    textureLoader.load(
      imageUri,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const renderTarget = pmremGenerator.fromEquirectangular(texture);
        setEnvMap(renderTarget.texture);
        texture.dispose();
      },
      undefined,
      (error) => {
        console.warn("[envLoader] Failed to load equirect:", error);
        setEnvMap(null);
      }
    );

    return () => {
      pmremGenerator.dispose();
    };
  }, [gl, imageUri]);

  return envMap;
}
