Repository Handoff: Archetype Orb Rendering

Scope
- Mobile app (Expo 54, RN 0.81.4, React 19.1.0, Hermes) with an orb built using @react-three/fiber/native (R3F) and three.
- Issue: R3F Canvas mounts on iOS but appears static/blank. Earlier we briefly had a rotating hotpink cube animating; after several iterations the region regressed to static again.

Current State
- Dependencies (package.json):
  - "@react-three/fiber": "^9.3.0"
  - "three": "^0.180.0"
  - "@react-three/drei": "^10.7.6" (not required right now; can be removed)
- Key files and settings:
  - src/components/three/ArchetypeOrbR3F.jsx: minimal R3F Canvas with ambientLight + RotatingDebugBox (useFrame), frameloop="always", DPR [1,1.5], transparent clear color, events disabled, shadows off. global.THREE set once.
  - src/components/home/AestheticProfile.js: renders <ArchetypeOrb> in Home; debug modal and excessive logs removed.
  - src/screens/Home/HomeScreen.js: ScrollView uses removeClippedSubViews={false} to avoid GL clipping.
  - src/screens/TestOrbScreen.js: full-screen orb test route (added for isolation).
  - App.js: lightweight RAF polyfill installed at startup.
- What’s visible: On device, Canvas area shows as a square (previously dark background). User reports no animation (hotpink cube not rotating). Earlier, a red overlay dot confirmed the container was visible and still static; that dot has been removed.

What We Tried (and reverted/simplified)
- Custom GLView + three renderer calling endFrameEXP each frame → rendered but static on device; dropped in favor of R3F/native Canvas.
- R3F frameloop variants: always, never+demand with invalidate, setAnimationLoop, setInterval advance() → still static on device.
- Removed heavy console logs & modal overlay; lowered DPR; disabled tone mapping and events.
- ScrollView clipping disabled; added full-screen TestOrbScreen; still static.
- Brief attempt to pin @react-three/fiber 8.15.17 + three 0.152.2 (known-good native matrix) conflicted with React 19; reverted to current deps.

Working Hypothesis
- Runtime incompatibility/RAF throttling between React 19 + RN 0.81 + Expo GL bridge and R3F on this device/build. Canvas mounts and clears, but R3F’s render loop isn’t presenting frames. A clean native rebuild is likely required; dependencies should be pruned to minimize peer conflicts.

High‑Priority Next Steps
1) Remove Drei and clean rebuild
   - npm uninstall @react-three/drei
   - rm -rf node_modules .expo
   - npm cache clean --force
   - npm install
   - expo run:ios (uninstall app from device/simulator first if needed)
   - npx expo start -c
   - Test: src/screens/TestOrbScreen.js → expect a rotating hotpink cube.

2) If still static — capture native logs and isolate
   - Run the app via Xcode (expo run:ios opens workspace) and capture logs around mount. Look for ExpoGL/EXGL or R3F warnings.
   - Temporarily replace the scene with a single mesh (no lights):
     - <Canvas frameloop="always"><mesh><boxGeometry /><meshBasicMaterial color="hotpink" /></mesh></Canvas>
     - Keep container View with collapsable={false} and visible background.

3) If rebuild doesn’t help — downgrade to a known-good R3F/three matrix
   - Option A (requires React 18): @react-three/fiber 8.15.17 + three 0.152.2.
   - Only if product allows downgrading React to 18.3.1 (otherwise skip).

4) If React 19 must stay — remove peer pressure
   - Keep only @react-three/fiber and three at versions above; remove drei (and thus @react-spring peers) until animation is confirmed.

5) Once animation works — reintroduce the orb
   - src/components/three/ArchetypeOrbR3F.jsx: add back OrbShell (meshBasicMaterial first) and three CloudMesh spheres with additive blending, driven by processArchetypeData().
   - Keep DPR [1,1], frameloop="always"; then tune visuals.

Repro Steps (current)
1) npm install
2) npx expo start -c
3) Navigate to Home (AestheticProfile) and to TestOrb (route added in AppNavigator).

Notes & Gotchas
- The warning “THREE.WebGLRenderer: WEBGL_lose_context extension not supported.” is benign on Expo GL.
- Keep a single three instance (global.THREE = THREE is set in ArchetypeOrbR3F.jsx).
- Remote Debugging or external React DevTools can stall RAF — keep them off during validation.
- If using ScrollViews/FlatLists near GL, ensure removeClippedSubViews={false} and test in a non-scrolling screen (TestOrbScreen).

Key Files to Check
- src/components/three/ArchetypeOrbR3F.jsx
- src/components/home/AestheticProfile.js
- src/screens/TestOrbScreen.js
- src/screens/Home/HomeScreen.js
- src/navigation/AppNavigator.js
- package.json (R3F/three versions)

Owner’s Intent
- Use @react-three/fiber/native (no Web flows) and keep a single three instance. Avoid presenting frames manually with WebGL calls; stick to R3F’s native loop.

Handy Commands
- Clean + Reinstall: rm -rf node_modules .expo && npm cache clean --force && npm i
- Rebuild iOS: expo run:ios
- Start Metro clean: npx expo start -c

Success Criteria
- Rotating hotpink cube visible and animating on both Home and TestOrb screens.
- Then, orb (shell + 3 clouds) visible and animating smoothly with DPR=1.

