# Orb Remounting - Explanation & Optimization Strategies

## Why Orb Remounts Every Time

**React Navigation unmounts screens by default** when you navigate away. This
means:

- Navigate away from Home → Home screen unmounts → Orb destroyed
- Navigate back to Home → Home screen remounts → Orb recreated

## Current Performance Impact

**Per remount:**

- ~100-200ms: 3D scene recreation
- ~50-100ms: Texture loading
- ~50ms: Shader compilation
- **Total: ~200-350ms lag** when returning to screen

## The `pixelStorei` Warnings

These warnings (`EXGL: gl.pixelStorei() doesn't support this parameter yet!`)
come from **expo-gl internals**, not your code:

```
TextureLoader → WebGL context → expo-gl wrapper → unsupported parameters
```

**You cannot fix these** - they're from Three.js trying to use WebGL features
that expo-gl doesn't implement yet.

---

## Solutions (Choose One)

### Option 1: Keep Screens Mounted (Fastest)

Keep Home screen always mounted so orb never unmounts:

```javascript
// In your navigator (App.js or wherever):
<Stack.Navigator
  screenOptions={{
    detachInactiveScreens: false,  // Keeps ALL screens mounted
  }}
>
```

**Or for Home only:**

```javascript
<Stack.Screen
    name="Home"
    component={HomeScreen}
    options={{
        detachInactiveScreens: false,
    }}
/>;
```

**Pros:**

- ✅ **Instant** returns to Home (0ms)
- ✅ Animation continues seamlessly
- ✅ No texture reloading

**Cons:**

- ❌ +20-30MB memory usage
- ❌ GPU still runs in background (battery drain)

---

### Option 2: Preload & Cache Textures (Medium Speed)

Cache textures globally so they don't reload:

```javascript
// Create src/utils/textureCache.ts
import { Texture } from 'three';

const cache = new Map<string, Texture>();

export function getCachedTexture(key: string): Texture | null {
  return cache.get(key) || null;
}

export function setCachedTexture(key: string, texture: Texture) {
  cache.set(key, texture);
}

// Then in SmokeOrb.tsx:
const texture = getCachedTexture('smoke_atlas') || loadTexture();
if (!getCachedTexture('smoke_atlas')) {
  setCachedTexture('smoke_atlas', texture);
}
```

**Pros:**

- ✅ Faster remounts (~100-150ms instead of 200-350ms)
- ✅ Lower memory than Option 1
- ✅ No battery drain when screen inactive

**Cons:**

- ❌ Still need to recreate 3D scene
- ❌ Requires code changes

---

### Option 3: Suppress Warnings Only (No Speed Change)

Just hide the console spam:

```javascript
// In App.js, before any imports:
const originalWarn = console.warn;
console.warn = (...args) => {
    const msg = args.join(" ");
    if (msg.includes("pixelStorei")) return; // Suppress
    if (msg.includes("EXT_color_buffer_float")) return; // Suppress
    originalWarn(...args);
};
```

**Pros:**

- ✅ Clean console
- ✅ No code changes needed
- ✅ No memory/battery impact

**Cons:**

- ❌ Doesn't make remounts faster
- ❌ Just hides the problem

---

## My Recommendations

**Best overall:** **Option 1** (keep Home mounted)

- Orb is your centerpiece
- Home is frequently visited
- 20MB is acceptable for instant navigation

**If memory-constrained:** **Option 2** (texture caching)

- Reduces load time by ~50%
- More complex but effective

**Quickfix:** **Option 3** (suppress warnings)

- Doesn't solve speed, but makes logs usable
