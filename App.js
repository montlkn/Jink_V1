/*
  File: App.js
  Description: The main entry point for the entire application.
  Its only job is to render the main navigator.
*/
import "expo-three";
import React from "react";
// Minimal RAF polyfill for R3F on devices that throttle rAF in RN
if (typeof global !== 'undefined') {
  const weakSet = WeakMap.prototype.set;
  WeakMap.prototype.set = function patchedWeakMapSet(key, value) {
    if (key === null || (typeof key !== "object" && typeof key !== "function")) {
      try {
        console.error("[WeakMap] invalid key", key, "value type:", typeof value);
      } catch (_) {}
    }
    return weakSet.call(this, key, value);
  };
  if (!global.performance) global.performance = { now: Date.now };
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb) => setTimeout(() => cb(global.performance.now()), 16);
  }
  if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  }
}
import { AuthProvider } from "./src/auth/authProvider";
import AppNavigator from "./src/navigation/AppNavigator";
import { OrbTransitionProvider } from "./src/state/orbTransitionContext";
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

export default function App() {
  return (
    <AuthProvider>
      <OrbTransitionProvider>
        <AppNavigator />
      </OrbTransitionProvider>
    </AuthProvider>
  );
}
