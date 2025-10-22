import { useEffect, useState } from "react";
import {
  EquirectangularReflectionMapping,
  LinearFilter,
  PMREMGenerator,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
  WebGLRenderer,
} from "three";
import { useThree } from "@react-three/fiber/native";
import { Asset } from "expo-asset";
import { TextureLoader as ExpoTextureLoader } from "expo-three";

type MaybeTexture = Texture | null;
type RGBELoaderCtor = typeof import("three-stdlib")["RGBELoader"];

let cachedRGBELoader: RGBELoaderCtor | null = null;
const envCache = new Map<
  string,
  {
    texture: Texture;
    refCount: number;
  }
>();

const getCacheKey = (asset: Asset | null | undefined): string | null => {
  if (!asset) return null;
  if (asset.localUri) return asset.localUri;
  if (asset.uri) return asset.uri;
  return null;
};

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

async function loadStandardTexture(localModule: any): Promise<Texture | null> {
  try {
    ensureDomPolyfills();
    const loader = new ExpoTextureLoader();
    return await new Promise((resolve, reject) => {
      loader.load(
        localModule?.localUri ?? localModule,
        (texture) => {
          texture.minFilter = LinearFilter;
          texture.magFilter = LinearFilter;
          texture.generateMipmaps = false;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  } catch (error) {
    console.warn("[envLoader] Expo texture load failed:", error);
    return null;
  }
}

async function loadHdrTexture(uri: string) {
  ensureDomPolyfills();
  if (!cachedRGBELoader) {
    const mod = await import("three-stdlib");
    cachedRGBELoader = mod.RGBELoader;
  }

  return await new cachedRGBELoader()
    .setDataType(UnsignedByteType)
    .loadAsync(uri);
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
    let cacheKey: string | null = null;
    let didAcquire = false;

    const releaseCache = () => {
      if (!didAcquire || !cacheKey) return;
      const entry = envCache.get(cacheKey);
      if (!entry) return;
      entry.refCount = Math.max(0, entry.refCount - 1);
    };

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

      cacheKey = getCacheKey(asset);
      if (!cacheKey) {
        if (!cancelled) {
          setEnvMap(null);
        }
        return;
      }

      const cached = envCache.get(cacheKey);
      if (cached) {
        cached.refCount += 1;
        didAcquire = true;
        if (!cancelled) {
          setEnvMap(cached.texture);
        } else {
          releaseCache();
          didAcquire = false;
        }
        return;
      }

      let equi: Texture | null = null;
      let shouldUsePmrem = false;

      try {
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error("Resolved asset is missing a URI");
        }

        const isHdr = uri.toLowerCase().endsWith(".hdr");

        if (isHdr) {
          equi = await loadHdrTexture(uri);
          shouldUsePmrem = true;
        } else {
          equi = await loadStandardTexture(asset);
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

      if (shouldUsePmrem && supportsPmrem(renderer)) {
        try {
          pmrem = new PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const { texture } = pmrem.fromEquirectangular(equi);
          pmrem.dispose();
          equi.dispose();

          envCache.set(cacheKey, { texture, refCount: 1 });
          didAcquire = true;

          if (!cancelled) {
            setEnvMap(texture);
          } else {
            releaseCache();
            didAcquire = false;
          }
          return;
        } catch (error) {
          console.warn("[envLoader] PMREM failed, using equirect:", error);
        }
      }

      envCache.set(cacheKey, { texture: equi, refCount: 1 });
      didAcquire = true;

      if (!cancelled) {
        setEnvMap(equi);
      } else {
        releaseCache();
        didAcquire = false;
      }
    })();

    return () => {
      cancelled = true;
      if (pmrem) {
        pmrem.dispose();
      }
      releaseCache();
      didAcquire = false;
    };
  }, [three.gl, localModule]);

  return envMap;
}
