import { useEffect, useState } from "react";
import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  Texture,
  WebGLRenderer,
  SRGBColorSpace,
} from "three";
import { useThree } from "@react-three/fiber/native";
import { Asset } from "expo-asset";
import { loadTextureAsync } from "expo-three";

type MaybeTexture = Texture | null;

async function resolveAsset(localModule: any): Promise<Asset | null> {
  try {
    if (!localModule) return null;
    const asset = Asset.fromModule(localModule);
    await asset.downloadAsync();
    return asset;
  } catch (error) {
    console.warn("[envLoader] Failed to resolve asset:", error);
    return null;
  }
}

function supportsPmrem(renderer: WebGLRenderer): boolean {
  try {
    const caps: any = renderer?.capabilities;
    const ctx: WebGLRenderingContext | WebGL2RenderingContext | undefined =
      renderer?.getContext?.();

    const isWebGL2 = Boolean(caps?.isWebGL2);
    if (!isWebGL2 || !ctx) {
      return false;
    }

    const hasFloatRT =
      ctx.getExtension?.("EXT_color_buffer_float") ||
      ctx.getExtension?.("WEBGL_color_buffer_float") ||
      ctx.getExtension?.("EXT_color_buffer_half_float");

    return Boolean(hasFloatRT);
  } catch (error) {
    console.warn("[envLoader] PMREM capability detection failed:", error);
    return false;
  }
}

export function useEnvMap(localModule: any) {
  const three = useThree();
  const [envMap, setEnvMap] = useState<MaybeTexture>(null);

  useEffect(() => {
    // Safety check: ensure we have a valid gl context
    if (!three?.gl) {
      console.warn("[envLoader] GL context not available yet");
      return;
    }

    let cancelled = false;
    let pmrem: PMREMGenerator | null = null;

    (async () => {
      const renderer = three.gl as WebGLRenderer;
      const asset = await resolveAsset(localModule);

      if (!asset || !renderer) {
        console.warn("[envLoader] Env asset missing or renderer unavailable.");
        if (!cancelled) {
          setEnvMap(null);
        }
        return;
      }

      let equi: Texture | null = null;

      try {
        // Use expo-three's loadTextureAsync with the asset
        equi = await loadTextureAsync({ asset });

        if (__DEV__) {
          console.log("[envLoader] Loaded result:", {
            isNull: equi === null,
            isUndefined: equi === undefined,
            isTexture: (equi as any)?.isTexture,
            type: typeof equi,
          });
        }

        if (!equi || !(equi as any).isTexture) {
          throw new Error("Loaded asset is not a THREE.Texture");
        }
        equi.colorSpace = SRGBColorSpace;
        equi.mapping = EquirectangularReflectionMapping;
        equi.needsUpdate = true;
      } catch (error) {
        console.warn("[envLoader] Expo texture load failed:", error);
        if (!cancelled) {
          setEnvMap(null);
        }
        return;
      }

      if (supportsPmrem(renderer)) {
        try {
          pmrem = new PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const { texture } = pmrem.fromEquirectangular(equi);
          equi.dispose();
          if (!cancelled) {
            setEnvMap(texture);
            return;
          }
          texture.dispose();
        } catch (error) {
          console.warn("[envLoader] PMREM failed, using equirect:", error);
        }
      }

      if (!cancelled) {
        setEnvMap(equi);
      } else {
        equi.dispose();
      }
    })();

    return () => {
      cancelled = true;
      if (pmrem) {
        pmrem.dispose();
      }
    };
  }, [three.gl, localModule]);

  return envMap;
}
