import { Asset } from "expo-asset";

const ENV = require("../../assets/env/qwantani_moon_noon_puresky_1k.png");
const SMOKE_ATLAS = require("../../assets/textures/smoke_atlas.png");
const SMOKE_ATLAS_STARTUP = require("../../assets/textures/smoke_atlas_startup.png");

let started = false;
let promise = null;

export function preloadOrbAssets() {
  if (started) return promise;
  started = true;
  promise = (async () => {
    try {
      const assets = [ENV, SMOKE_ATLAS, SMOKE_ATLAS_STARTUP].map((m) => Asset.fromModule(m));
      await Promise.all(assets.map((a) => a.downloadAsync()));
      return true;
    } catch (e) {
      console.warn("[orbAssets] Preload failed", e);
      return false;
    }
  })();
  return promise;
}

