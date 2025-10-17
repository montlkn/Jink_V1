# Orb V2: Volumetric Smoke + Refractive Glass (Full Spec)

> Purpose: deliver a realistic, semi-3D/3D glass orb with true refraction and layered volumetric smoke that responds to user archetypes and XP, runs on mobile with LODs, and ships behind a feature flag with graceful fallbacks.

---

## 0) TL;DR Outcomes

* Replace sprite/billboard smoke with a **ray-marched volumetric stack** (3 layers).
* Add a **refractive glass shell** with Fresnel and highlights.
* Drive color/energy/turbulence from **archetype data** and **XP**; expose **FSM states**.
* Hit **30+ fps** on mid-tier devices via **LOD presets**, **downscaled render target**, **early exit** march, and **snapshot** fallback.
* Ship behind a **feature flag**, keep legacy paths as **fallback tiers** until stable.

---

## 1) Current Implementation (Aura_Profile)

### Files and roles

* `src/components/three/ArchetypeOrbR3F.jsx`
  Instanced sprites with FBM; has a basic or placeholder shell and a **SAFE_MODE** path.

* `src/components/three/ArchetypeOrbScene.jsx`
  Billboard smoke variant, improved scene lights, transmission shell.

* `src/components/ArchetypeOrb.js`
  Wrapper that switches orb modes across the app.

### Limitations to address

* No true volumetric accumulation
* No physically plausible refraction, no inner collision response
* Lighting not set up for glass realism
* Visual read is “glittery sprites,” not smoke inside a glass object

---

## 2) Proposed Architecture (Modular)

```
src/
  components/
    three/
      orb/
        VolSmoke.jsx              # Ray-marched sphere-bounded volume (FBM/curl)
        VolSmokeLayer.jsx         # Optional wrapper for per-layer params
        GlassShell.jsx            # Refractive shell (Transmission/Physical + Fresnel)
        OrbLights.jsx             # Dramatic light rig + optional HDR env
        ArchetypeMapping.ts       # Archetype → hue/density/scale/rotationSpeed
        OrbFSM.ts                 # State machine → uniforms (energy, turbulence, pulse)
        ArchetypeOrbV2.jsx        # Orchestrator: composes layers, shell, lights
  components/
    ArchetypeOrb.js               # Add mode="volumetric" (feature flag)
  screens/
    HomeScreen.jsx                # Consumes <ArchetypeOrb mode="volumetric" .../>
docs/
  plans/
    orb_v2_spec.md                # This document
```

**Layering:** Core (dense/slow), Energy (mid/pulsing), Ripple (outer/airy).
**Order:** volumes back-to-front, then shell.
**Blending:** volumes additive, `depthWrite: false`; shell `depthWrite: true`.

---

## 3) Public API

```ts
type OrbLOD = "ultra" | "standard" | "low" | "safe";

type Archetype =
  | "classicist" | "romantic" | "stylist" | "modernist"
  | "industrialist" | "visionary" | "popculturalist"
  | "vernacularist" | "austerist";

type ArchetypeStrengths = Record<Archetype, number>; // 0..1

type OrbFSMState = "IDLE" | "PRESS" | "PROCESSING" | "SUCCESS" | "FAILURE";

type Props = {
  size?: number;                    // on-screen diameter in px
  archetypes: ArchetypeStrengths;   // normalized vector
  xpLevel: number;                  // integer
  xpProgress?: number;              // 0..1 within current level
  fsmState?: OrbFSMState;
  lod?: OrbLOD;                     // override; else auto
  animateOrbMotion?: boolean;       // subtle bob/tilt for parallax
};
```

---

## 4) Data Mapping

* **Top 3 archetypes** drive 3 smoke layers.
* **Hue** from a table; **density/scale/rotationSpeed** from strength.
* **Brightness** scales with **XP**; **FSM** adds transient pulses or turbulence spikes.

Example mapping:

```ts
color   = hueToRGB(ARCHETYPE_HUES[type]);
density = 0.3 + strength * 0.6;
scale   = 1.0 + strength * 0.4;
rotationSpeed = 0.05 + (1 - strength) * 0.1;
brightness = base + k1 * xpLevel + k2 * xpProgress;
turbulence = baseT + fsmTurbulence(fsmState);
```

---

## 5) Core Components

### 5.1 VolSmoke.jsx

* **Goal:** render a sphere-bounded volumetric smoke via raymarch.
* **Shader:** fBm/curl noise field sampled along the view ray inside a unit sphere.
* **Uniforms:** `u_time, u_color (rgb), u_brightness, u_density, u_turbulence, u_noiseScale, u_renderScale, u_rotation`.
* **Performance:** 16–24 steps on mobile; **early exit** when `accum > cutoff`; ray/sphere intersection to skip outside pixels.

### 5.2 VolSmokeLayer.jsx (optional but recommended)

* Thin wrapper that applies transforms and passes per-layer params so `VolSmoke` stays generic.

### 5.3 GlassShell.jsx

* **Material:** Drei `MeshTransmissionMaterial` (preferred) or `MeshPhysicalMaterial`.
* **Params:** IOR 1.45–1.5, thin `thickness` 0.3–0.5, low samples, mild roughness, clearcoat.
* **Extras:** Fresnel rim term; two subtle highlight quads or small lights to sell curvature.
* **Render:** after volumes; `depthWrite: true` to preserve convincing refraction.

### 5.4 OrbLights.jsx

* **Rig:** Key `RectAreaLight`, rim `PointLight`, dim fill; optional HDR env.
* **Props:** `{ intensity, dramatic?: boolean, hdrEnv?: string }`.

### 5.5 OrbFSM.ts

* State machine that yields transient uniforms for `turbulence`, `energy`, `pulse`.
* Mappings:

  * IDLE: low turbulence, slow rotation
  * PRESS: higher emission + noise amp
  * PROCESSING: faster swirl frequency
  * SUCCESS: short bright pulse
  * FAILURE: turbulence spike + desaturation

### 5.6 ArchetypeOrbV2.jsx

* Orchestrates 3 `VolSmoke` layers + `GlassShell` + `OrbLights`.
* Applies **LOD**, sets **render scale** target, handles **feature flag** and **fallback tiers**.
* Plumbs in archetype/XP/FSM → uniforms.

---

## 6) Rendering, Blending, and Collision

* **Collision:** clamp march samples to inside radius `<= shellRadius * 0.98` to fake smoke colliding with glass.
* **Order:** core → energy → ripple → shell.
* **Blending:** volumes `AdditiveBlending`, `depthWrite: false`; shell `depthWrite: true`.
* **Motion:** gentle orb world motion; layer counter-rotation; small noise offsets driven by `rotationSpeed`.

---

## 7) LOD, Budget, and Fallbacks

```ts
const LOD_PRESETS = {
  ultra:    { steps: 24, renderScale: 0.7, lights: "full" },
  standard: { steps: 20, renderScale: 0.6, lights: "simplified" },
  low:      { steps: 16, renderScale: 0.5, lights: "minimal" },
  safe:     { fallback: "snapshot" } // pre-rendered frame
};
```

* **Device tier detection:** simple heuristic (platform + RAM bucket + thermal hints).
* **Downscale** the smoke pass to `renderScale`, upscale in composite.
* **Pause/Throttle:** idle 15–30 fps, burst to 45–60 fps only in interactions.
* **Snapshot renderer:** for static contexts (Profile/Passport), render once to texture/PNG and mount as `<Image>`.

---

## 8) Migration & Feature Flag

1. **Quarantine legacy:** keep `ArchetypeOrbR3F.jsx` and `ArchetypeOrbScene.jsx` intact behind a flag.
2. **Add new mode:**

   ```jsx
   // ArchetypeOrb.js
   if (mode === "volumetric") return <ArchetypeOrbV2 {...props} />;
   ```
3. **Swap usage** on Home/Profile with the flag on; flip per-screen if needed.
4. **Delete legacy** once stability and performance targets are met.

---

## 9) Implementation Plan (Milestones)

### Milestone 1: Volumetric Core

* Implement `VolSmoke.jsx` with sphere-bounded march, 20 steps, early exit.
* Instantiate 3 layers directly in `ArchetypeOrbV2.jsx`.
* Wire **existing** archetype pipeline outputs into props.
* Target: “reads as smoke, not sprites.”

### Milestone 2: Glass & Lighting

* Implement `GlassShell.jsx` with transmission/physical material.
* Add `OrbLights.jsx` and tune for dramatic highlights and readable volume.
* Target: “smoke refracts through glass; edges catch highlights.”

### Milestone 3: Performance & FSM

* Add LOD presets and device-tier selection.
* Implement `OrbFSM.ts` and wire uniforms for turbulence/energy/pulse.
* Add **snapshot** path and finalize feature flag rollout.
* Target: 30+ fps on mid-tier phones (Standard LOD), graceful fallback on low-end.

---

## 10) Testing & Telemetry Gates

Record for each build:

* Median FPS, 99th percentile frame time
* Thermal state after 60 s idle and 30 s interaction
* GPU time estimate if available
* Visual checks: banding, temporal aliasing, highlight clipping

Gate rules:

* If frame time or thermals regress vs previous milestone, **rollback** the change.

---

## 11) Acceptance Criteria

* Wisps **evolve at rest**; no “spinning texture” artifacts.
* Shell shows **believable refraction** and a **Fresnel rim** under the light rig.
* **Top 3 archetypes** clearly inform color/scale/density; **XP** increases brightness; **FSM** events drive turbulence/pulses.
* **Standard LOD** ≥ 30 fps on mid-tier phones; **Safe Mode/Snapshot** look coherent.

---

## 12) Notes and Constraints

* Keep raymarch step count within budget; rely on early exit.
* Avoid shadow maps on mobile; prefer specular highlights and environment lighting.
* Prefer uniform-driven drama over geometry churn.
* Maintain fallback tiers until telemetry proves stability.

---

## 13) Deliverables

* `src/components/three/orb/VolSmoke.jsx`
* `src/components/three/orb/VolSmokeLayer.jsx` (optional)
* `src/components/three/orb/GlassShell.jsx`
* `src/components/three/orb/OrbLights.jsx`
* `src/components/three/orb/ArchetypeMapping.ts`
* `src/components/three/orb/OrbFSM.ts`
* `src/components/three/orb/ArchetypeOrbV2.jsx`
* `src/components/ArchetypeOrb.js` (feature flag mode)
* `docs/plans/orb_v2_spec.md` (this file)

---

## 14) Future Enhancements (post-V2)

* Audio reactivity
* Particle trails during scans
* WebGPU path for cleaner blending and higher step counts
