/*
  File: App.js
  Description: The main entry point for the entire application.
  Its only job is to render the main navigator.
*/

// Minimal RAF polyfill for R3F on devices that throttle rAF in RN
// MUST be before importing expo-three
import "expo-three";
import "@/lib/log";
import React, { useEffect } from "react";
import RootNavigator from "@/navigation/RootNavigator";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";

if (typeof global !== 'undefined') {
  const primitiveStoreSymbol = Symbol.for("__weakmapPrimitiveStore");
  const primitiveLogSymbol = Symbol.for("__weakmapPrimitiveLog");
  const weakSet = WeakMap.prototype.set;
  const weakGet = WeakMap.prototype.get;
  const weakHas = WeakMap.prototype.has;
  const weakDelete = WeakMap.prototype.delete;

  const isObjectKey = (key) =>
    !(key === null || (typeof key !== "object" && typeof key !== "function"));

  WeakMap.prototype.set = function patchedWeakMapSet(key, value) {
    if (isObjectKey(key)) {
      return weakSet.call(this, key, value);
    }

    if (__DEV__) {
      try {
        const repr =
          key === null ? "null" : `${typeof key}${typeof key === "number" ? `:${key}` : ""}`;
        if (__DEV__ && !this[primitiveLogSymbol]) {
          Object.defineProperty(this, primitiveLogSymbol, {
            value: new Set(),
            enumerable: false,
            configurable: false,
            writable: false,
          });
        }
        if (__DEV__ && !this[primitiveLogSymbol].has(repr)) {
          this[primitiveLogSymbol].add(repr);
          const stack = new Error().stack
            ?.split("\n")
            .slice(2, 5)
            .map((line) => line.trim())
            .join(" ⟶ ");
          console.warn(
            "[WeakMap shim] storing primitive key",
            repr,
            stack ? `stack: ${stack}` : ""
          );
        }
      } catch (_) {}
    }

    if (!this[primitiveStoreSymbol]) {
      Object.defineProperty(this, primitiveStoreSymbol, {
        value: new Map(),
        enumerable: false,
        configurable: false,
        writable: false,
      });
    }

    this[primitiveStoreSymbol].set(key, value);
    return this;
  };

  WeakMap.prototype.get = function patchedWeakMapGet(key) {
    if (isObjectKey(key)) {
      return weakGet.call(this, key);
    }

    return this[primitiveStoreSymbol]?.get(key);
  };

  WeakMap.prototype.has = function patchedWeakMapHas(key) {
    if (isObjectKey(key)) {
      return weakHas.call(this, key);
    }

    return this[primitiveStoreSymbol]?.has(key) ?? false;
  };

  WeakMap.prototype.delete = function patchedWeakMapDelete(key) {
    if (isObjectKey(key)) {
      return weakDelete.call(this, key);
    }

    return this[primitiveStoreSymbol]?.delete(key) ?? false;
  };
  if (!global.performance) global.performance = { now: Date.now };
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb) => setTimeout(() => cb(global.performance.now()), 16);
  }
  if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  // Polyfill document for three.js
  if (!global.document) {
    global.document = {
      getElementsByTagName: () => [],
      createElement: () => ({
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      createElementNS: () => ({
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    };
  }
  if (typeof global.document.contains !== "function") {
    global.document.contains = () => false;
  }
  if (!global.document.body) {
    global.document.body = {
      appendChild: () => {},
      removeChild: () => {},
      contains: () => false,
    };
  } else {
    if (typeof global.document.body.appendChild !== "function") {
      global.document.body.appendChild = () => {};
    }
    if (typeof global.document.body.removeChild !== "function") {
      global.document.body.removeChild = () => {};
    }
    if (typeof global.document.body.contains !== "function") {
      global.document.body.contains = () => false;
    }
  }

}
// This is our global color and theme configuration

const AppTheme = {
  dark: false,
  colors: {
    primary: "#000",
    background: "#F8F8F8",
    card: "#fff",
    text: "#000",
    border: "#e0e0e0",
    notification: "rgb(255, 69, 58)",
  },
};

const ORB_ASSETS = [
  require("./assets/env/qwantani_moon_noon_puresky_1080.jpg"),
  require("./assets/textures/smoke_atlas.png"),
];

export default function App() {
  const [fontsLoaded] = useFonts({
    ArchetypeLabel: require("./assets/fonts/Jacquard12-Regular.ttf"),
  });

  useEffect(() => {
    Asset.loadAsync(ORB_ASSETS).catch((error) => {
      console.warn("[App] Failed to preload orb assets", error);
    });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return <RootNavigator />;
}
