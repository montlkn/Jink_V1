# **ORB REBUILD PLAN**

## **Objective**

Upgrade the Archetype Orb from a point-based pseudo-smoke visualization to a **volumetric, swirling emission system** that reflects the user’s top three aesthetic archetypes.
The orb should behave as a living visual anchor — dynamic, layered, and emotionally communicative — while maintaining good performance across mobile and desktop devices.

---

## **1. Current Implementation Summary**

| Component           | File                    | Role                                                                                                          |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ArchetypeOrbScene` | `ArchetypeOrbScene.jsx` | Sprite-based smoke system using instancing and 2D FBM noise in fragment shader                                |
| `ArchetypeOrbR3F`   | `ArchetypeOrbR3F.jsx`   | Simplified instanced smoke system with safe mode for mobile, using billboard quads and cheaper fragment logic |
| `ArchetypeOrb`      | `ArchetypeOrb.js`       | Top-level mode switch between “shader” (R3F) and “clouds” (Scene) modes                                       |

### **Current Visuals**

* System produces point-like “sparkling” visuals, not cohesive volumetric smoke.
* No consistent layer blending or true flow; particles orbit without density accumulation.
* Shader smoke is limited to planar billboards without ray-marching or volumetric depth.

### **Safe Mode**

* Currently active (`SAFE_MODE = true` in `ArchetypeOrbR3F.jsx`).
* Falls back to static point materials (`THREE.PointsMaterial`), removing any procedural noise or flow dynamics.

---

## **2. Core Goal for the Rebuild**

Transform the orb into a **layered volumetric system** representing the **top three aesthetic archetypes**, where:

* Each archetype controls **color**, **scale**, and **density** of a unique smoke layer.
* The three smokes **swirl and mix** within the orb volume, producing a cohesive emission.
* Confidence, XP deltas, and scan feedback modulate **turbulence**, **hue shifts**, and **emission intensity**.

---

## **3. Visual Design Targets**

| Layer            | Source Archetype | Visual Role                            | Motion Profile                      |
| ---------------- | ---------------- | -------------------------------------- | ----------------------------------- |
| **Core Smoke**   | Top archetype    | Dense, slow, stable volume near center | Slow swirling curl noise            |
| **Energy Smoke** | 2nd archetype    | Mid-scale layer, subtle pulsations     | Moderate flow speed                 |
| **Ripple Smoke** | 3rd archetype    | Outer halo, energetic, airy            | Faster rotation + higher turbulence |

---

## **4. Technical Implementation Plan**

### **PHASE 1: Volumetric Smoke Shader**

**Goal:** Replace billboard noise shader with a true volumetric ray-marched shader.

**Approach:**

* Replace fragment shader with a ray-marched FBM noise field:

  ```glsl
  for(float i=0.0; i<1.0; i+=0.05){
    float d = fbm(p + i*dir + time*0.1);
    density += smoothstep(0.4, 1.0, d) * 0.05;
  }
  ```
* Accumulate density along the view ray for self-blending.
* Add Fresnel-style rim attenuation to simulate light scattering.
* Convert per-archetype color → hue-based RGB for each layer.

**Outcome:** Continuous smoke volume instead of visible quads.

---

### **PHASE 2: Layer Composition**

**Goal:** Create three volumetric layers (core, energy, ripple) mapped to user’s top archetypes.

**Tasks:**

* Sort `archetype_vector` descending by strength.
* Map top 3 archetypes to:

  ```ts
  { color, percentage, rotationSpeed, opacity }
  ```
* Instantiate three `<VolSmoke />` meshes, each with unique hue, density, and scale.
* Animate layers in opposite directions for mixing depth.

**Example:**

```tsx
<VolSmoke color={c1} density={d1} scale={1.0}/>
<VolSmoke color={c2} density={d2} scale={1.15}/>
<VolSmoke color={c3} density={d3} scale={1.3}/>
```

---

### **PHASE 3: Archetype Integration**

**Goal:** Use actual archetype data to drive smoke attributes.

```ts
const ARCHETYPE_HUES = {
  classicist: 36,
  romantic: 24,
  stylist: 310,
  modernist: 200,
  industrialist: 20,
  visionary: 270,
  popculturalist: 340,
  vernacularist: 110,
  austerist: 45,
};
```

**Mappings:**

* `color` → HSL(ARCHETYPE_HUES[type])
* `density` → 0.3 + (strength * 0.6)
* `scale` → 1.0 + (strength * 0.4)
* `rotationSpeed` → 0.05 + (1 - strength) * 0.1

---

### **PHASE 4: FSM Integration**

**Goal:** Tie Orb FSM states into shader behavior.

| State          | Shader Response                         |
| -------------- | --------------------------------------- |
| **IDLE**       | Low turbulence, slow spin               |
| **PRESS**      | Increase emission + noise amplitude     |
| **PROCESSING** | Boost swirl frequency                   |
| **SUCCESS**    | Add bright pulse ripple                 |
| **FAILURE**    | Increase turbulence + desaturate colors |

Integrate via uniform updates:

```ts
material.uniforms.uTurbulence.value = interpolateFSM(state);
material.uniforms.uEnergy.value = lerp(old, target, 0.1);
```

---

### **PHASE 5: Performance Optimization**

* **Raymarch iterations:** 20–25 max for mobile.
* **Render order:** core → energy → ripple → shell.
* **Blending:** `THREE.AdditiveBlending` with depthWrite disabled.
* **Fallback:** keep `SAFE_MODE` path for low-end devices.
* **Snapshot Renderer:** capture a single frame to PNG for non-interactive contexts (Profile, Passport).

---

### **PHASE 6: Refraction + Shell Improvements**

* Replace static shell with **transparent meshPhysicalMaterial** for light refraction.
* Add internal reflection and optional IOR adjustment.

---

## **5. Deliverables**

| File                                       | Deliverable                    | Description                          |
| ------------------------------------------ | ------------------------------ | ------------------------------------ |
| `src/components/three/VolSmoke.jsx`        | New volumetric smoke component | Ray-marched FBM + archetype uniforms |
| `src/components/three/ArchetypeOrbR3F.jsx` | Updated main entry             | VolSmoke integration + FSM sync      |
| `src/components/three/OrbFSM.ts`           | State machine hook             | Orb lifecycle logic                  |
| `docs/plans/orb_plan.md`                   | This file                      | Technical blueprint                  |

---

## **6. Timeline Estimate**

| Week       | Focus                                 | Deliverables                     |
| ---------- | ------------------------------------- | -------------------------------- |
| **Week 1** | Implement volumetric shader prototype | VolSmoke shader + blending tests |
| **Week 2** | Integrate top-three archetype data    | Dynamic color + density mapping  |
| **Week 3** | FSM and backend connection            | Success/failure feedback loops   |
| **Week 4** | Performance + fallback paths          | Safe mode + snapshot renderer    |
| **Week 5** | QA and color calibration              | Visual parity with design refs   |

---

## **7. Long-Term Enhancements**

* Add **audio-reactivity** via FFT of ambient input.
* Support **dynamic lighting** for orbital glow.
* Integrate **particle trails** during scans.
* Migrate to **WebGPU path** for smoother blending once available.

---

## **Summary**

The next version of the orb will:

* Render three dynamic volumetric smokes representing the user’s aesthetic hierarchy.
* Visually merge those smokes into a coherent, breathing structure.
* Respond in real time to confidence, scans, and profile shifts.
* Maintain graceful degradation via safe mode and snapshots.

**Outcome:**
A visually rich, performant R2F orb that finally looks like the emotional, atmospheric system described in the original design docs — not a collection of dots pretending to be smoke.

---