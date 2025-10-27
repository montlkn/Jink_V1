// Basic KTX2 → RGBA loader for React Native.
// This keeps everything on the JS thread (no WebWorkers) and prioritises stability.

import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { DataTexture, LinearFilter, RGBAFormat } from "three";
import type { DataTexture as ThreeDataTexture, WebGLRenderer } from "three";

type BasisModuleType = {
  initializeBasis: () => void;
  KTX2File: new (data: Uint8Array) => any;
  TranscoderTextureFormat?: {
    RGBA32?: number;
    RGBA32S?: number;
  };
};

const BASIS_JS = require("../../../assets/basis/basis_transcoder.js.dat");
const BASIS_WASM = require("../../../assets/basis/basis_transcoder.wasm");

let basisModulePromise: Promise<BasisModuleType> | null = null;

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const outputLength = Math.floor((cleaned.length * 3) / 4) - (cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0);
  const bytes = new Uint8Array(outputLength);

  let buffer = 0;
  let bits = 0;
  let idx = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "=") break;
    const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(char);
    if (code < 0) continue;
    buffer = (buffer << 6) | code;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[idx++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes;
}

function uint8ArrayToUtf8(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return result;
}

function decodeBase64ToUtf8(base64: string): string {
  const bytes = decodeBase64ToUint8Array(base64);
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      // Fall back to manual decoding below.
    }
  }
  return uint8ArrayToUtf8(bytes);
}

async function loadTextAsset(moduleRef: number): Promise<string> {
  const asset = Asset.fromModule(moduleRef);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("[loadKtx2Texture] Unable to resolve asset URI");

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64ToUtf8(base64);
}

async function loadBinaryAsset(moduleRef: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(moduleRef);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("[loadKtx2Texture] Unable to resolve binary asset URI");

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return decodeBase64ToUint8Array(base64);
}

async function ensureBasisModule(): Promise<BasisModuleType> {
  if (basisModulePromise) return basisModulePromise;

  basisModulePromise = (async () => {
    const [jsSource, wasmBinary] = await Promise.all([loadTextAsset(BASIS_JS), loadBinaryAsset(BASIS_WASM)]);

    const previousProcess = global.process;
    if (previousProcess && previousProcess.versions && previousProcess.versions.node) {
      try {
        // @ts-ignore - React Native exposes a process shim; disable Node path in Basis runtime.
        global.process = undefined;
      } catch (error) {
        console.warn("[loadKtx2Texture] Failed to clear process shim", error);
      }
    }

    let createBasis: ((module?: any) => BasisModuleType) | null = null;
    try {
      const makeFactory = Function(`${jsSource}; return BASIS;`) as () => (module?: any) => BasisModuleType;
      createBasis = makeFactory?.();
    } finally {
      if (previousProcess) {
        // @ts-ignore
        global.process = previousProcess;
      }
    }

    if (!createBasis) {
      throw new Error("[loadKtx2Texture] Failed to resolve Basis factory");
    }

    const module: BasisModuleType = await new Promise((resolve) => {
      const Module: any = {
        wasmBinary,
        onRuntimeInitialized: () => resolve(Module),
      };
      createBasis(Module);
    });

    module.initializeBasis();
    return module;
  })();

  return basisModulePromise;
}

const TRANSCODER_FORMAT_RGBA32 = 13; // Basis universal constant for RGBA32

type LoadResult = {
  texture: ThreeDataTexture;
};

export async function loadKtx2TextureFromAsset(
  _renderer: WebGLRenderer,
  moduleRef: number,
): Promise<LoadResult | null> {
  try {
    const basisModule = await ensureBasisModule();

    const asset = Asset.fromModule(moduleRef);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      throw new Error("[loadKtx2Texture] Unable to resolve KTX2 asset URI");
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = decodeBase64ToUint8Array(base64);

    const ktx2File = new basisModule.KTX2File(bytes);

    const cleanup = () => {
      ktx2File.close();
      ktx2File.delete();
    };

    if (!ktx2File.isValid()) {
      cleanup();
      throw new Error("[loadKtx2Texture] Invalid .ktx2 file");
    }

    const width = ktx2File.getWidth();
    const height = ktx2File.getHeight();
    const supercompression =
      typeof ktx2File.getSupercompressionScheme === "function"
        ? ktx2File.getSupercompressionScheme()
        : -1;

    if (__DEV__) {
      console.log("[loadKtx2Texture] Prepared KTX2 asset", {
        name: asset.name ?? asset.hash ?? "unknown",
        width,
        height,
        levels: typeof ktx2File.getLevels === "function" ? ktx2File.getLevels() : undefined,
        supercompression,
      });
    }

    if (supercompression === 2) {
      console.warn(
        "[loadKtx2Texture] ZSTD supercompression detected. Ensure the Basis transcoder build includes ZSTD support."
      );
    }

    if (!ktx2File.startTranscoding()) {
      cleanup();
      throw new Error("[loadKtx2Texture] startTranscoding failed");
    }

    const level = 0;
    const layer = 0;
    const face = 0;
    const transcoderFormat =
      (basisModule as any)?.TranscoderTextureFormat?.RGBA32 ??
      (basisModule as any)?.TranscoderTextureFormat?.RGBA32S ??
      TRANSCODER_FORMAT_RGBA32;
    const size = ktx2File.getImageTranscodedSizeInBytes(level, layer, face, transcoderFormat);
    const dst = new Uint8Array(size);

    const ok = ktx2File.transcodeImage(dst, level, layer, face, transcoderFormat, 0, 0, 0);
    if (!ok) {
      cleanup();
      throw new Error(
        `[loadKtx2Texture] transcodeImage failed (format ${transcoderFormat}, size ${width}x${height})`
      );
    }

    cleanup();

    if (__DEV__) {
      console.log(
        "[loadKtx2Texture] Loaded KTX2 texture",
        { width, height, format: transcoderFormat, bytes: dst.byteLength }
      );
    }

    const texture = new DataTexture(dst, width, height, RGBAFormat);
    texture.needsUpdate = true;
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;

    return { texture };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(
        "[loadKtx2Texture] Failed to load KTX2 texture:",
        error.message || error.toString(),
        error.stack ? `\n${error.stack}` : ""
      );
    } else {
      console.warn("[loadKtx2Texture] Failed to load KTX2 texture:", error);
    }
    return null;
  }
}
