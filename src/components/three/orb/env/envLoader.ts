import { useEffect, useState } from "react";
import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UnsignedByteType,
  WebGLRenderer,
} from "three";
import { useThree } from "@react-three/fiber/native";
import { Asset } from "expo-asset";
import { RGBELoader } from "three-stdlib";

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

function ensureDomPolyfills() {
  const globalAny = global as any;
  if (!globalAny.document) {
    globalAny.document = {};
  }
  const doc = globalAny.document;
  if (typeof doc.createElement !== "function") {
    doc.createElement = () => ({
      style: {},
      setAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => null,
    });
  }
  if (typeof doc.createElementNS !== "function") {
    doc.createElementNS = () => ({
      style: {},
      setAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => null,
    });
  }
  if (typeof doc.getElementsByTagName !== "function") {
    doc.getElementsByTagName = () => [];
  }
  if (!doc.body) {
    doc.body = {
      appendChild: () => {},
      removeChild: () => {},
    };
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
    let generatedTexture: Texture | null = null;

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
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error("Resolved asset is missing a URI");
        }

        const isHdr = uri.toLowerCase().endsWith(".hdr");

        if (isHdr) {
          equi = await new RGBELoader()
            .setDataType(UnsignedByteType)
            .loadAsync(uri);
        } else {
          ensureDomPolyfills();
          const loader = new TextureLoader();
          equi = await loader.loadAsync(uri);
        }

        if (!equi || !(equi as any).isTexture) {
          throw new Error("Loaded asset is not a THREE.Texture");
        }

        equi.mapping = EquirectangularReflectionMapping;
        equi.colorSpace = SRGBColorSpace;
        equi.needsUpdate = true;
      } catch (error) {
        console.warn("[envLoader] Environment texture load failed:", error);
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

          generatedTexture = texture;

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
        generatedTexture = equi;
      } else {
        equi.dispose();
      }
    })();

    return () => {
      cancelled = true;
      if (pmrem) {
        pmrem.dispose();
      }
      if (generatedTexture) {
        generatedTexture.dispose();
      }
    };
  }, [three.gl, localModule]);

  return envMap;
}
