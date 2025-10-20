import { useThree } from "@react-three/fiber/native";
import { useEffect, useState } from "react";
import * as THREE from "three";

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

  useEffect(() => {
    // For now, we'll create a simple procedural environment
    // In production, you could load an actual HDR or LDR equirect image
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();

    try {
      // Create a simple gradient environment
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x444444);

      // Add some ambient lighting to the env scene
      const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
      topLight.position.set(0, 1, 0);
      envScene.add(topLight);

      const sideLight = new THREE.DirectionalLight(0x8899ff, 0.5);
      sideLight.position.set(1, 0, 0);
      envScene.add(sideLight);

      // Generate PMREM from scene
      const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
      setEnvMap(renderTarget.texture);

      return () => {
        pmremGenerator.dispose();
        renderTarget.dispose();
      };
    } catch (error) {
      console.warn("[envLoader] Failed to create environment map:", error);
      setEnvMap(null);
    }
  }, [gl]);

  return envMap;
}

/**
 * Alternative: Load environment from equirectangular image
 * (Requires expo-asset and proper image loading)
 */
export function useEnvMapFromEquirect(imageUri: string): THREE.Texture | null {
  const { gl } = useThree();
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
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
