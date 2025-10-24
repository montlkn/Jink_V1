// Basic KTX2 → RGBA loader for React Native.
// This keeps everything on the JS thread (no WebWorkers) and prioritises stability.

import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { DataTexture, LinearFilter, RGBAFormat } from "three";
import type { DataTexture as ThreeDataTexture, WebGLRenderer } from "three";

type BasisModuleType = {
  initializeBasis: () => void;
  KTX2File: new (data: Uint8Array) => any;
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

async function loadTextAsset(moduleRef: number): Promise<string> {
  const asset = Asset.fromModule(moduleRef);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("[loadKtx2Texture] Unable to resolve asset URI");

  return FileSystem.readAsStringAsync(uri);
}

async function loadBinaryAsset(moduleRef: number): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(moduleRef);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("[loadKtx2Texture] Unable to resolve binary asset URI");

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return decodeBase64ToUint8Array(base64).buffer;
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

    let factory: (module: any) => any;
    try {
      factory = Function("Module", `${jsSource}; return BASIS;`) as (module: any) => any;
    } finally {
      if (previousProcess) {
        // @ts-ignore
        global.process = previousProcess;
      }
    }

    const module: BasisModuleType = await new Promise((resolve) => {
      const Module = {
        wasmBinary,
        onRuntimeInitialized: () => resolve(Module),
      };
      factory?.(Module);
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
    if (!uri) throw new Error("[loadKtx2Texture] Unable to resolve KTX2 asset URI");

    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

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

    if (!ktx2File.startTranscoding()) {
      cleanup();
      throw new Error("[loadKtx2Texture] startTranscoding failed");
    }

    const level = 0;
    const layer = 0;
    const face = 0;
    const size = ktx2File.getImageTranscodedSizeInBytes(level, layer, face, TRANSCODER_FORMAT_RGBA32);
    const dst = new Uint8Array(size);

    const ok = ktx2File.transcodeImage(dst, level, layer, face, TRANSCODER_FORMAT_RGBA32, 0, 0, 0);
    if (!ok) {
      cleanup();
      throw new Error("[loadKtx2Texture] transcodeImage failed");
    }

    cleanup();

    const texture = new DataTexture(dst, width, height, RGBAFormat);
    texture.needsUpdate = true;
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;

    return { texture };
  } catch (error) {
    console.warn("[loadKtx2Texture] Failed to load KTX2 texture", error);
    return null;
  }
}
