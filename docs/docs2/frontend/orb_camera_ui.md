# Orb + Camera UI (Refactor)

## Summary
This document unifies the orb visualization and the camera scanning UI into a single interaction model. The orb is the button, the status light, and the emotional feedback. Flow: idle orb → press-and-hold capture → smoke/energy bloom → scan processing → resolve (success or retry) → micro-shift in hue/shape based on archetype drift.

## Purpose
Deliver a fast, legible, delight-first scanning experience where the orb is the user’s anchor. Remove visual whiplash between "profile orb" and "camera button" by making them the same entity.

## Interaction Choreography
1) Idle
- Orb at rest: base size 1.0, low-noise surface, colors mapped to top-2 archetypes.
- Subtle breathing at 0.2 Hz. Confidence low → slightly more surface turbulence.

2) Press-and-hold
- Finger down enlarges orb to 1.08 over 120 ms; inner smoke begins a clockwise drift.
- Haptic tick on press.

3) Capture
- Release triggers capture. Orb collapses to 0.94 then rebounds to 1.05 with a brief white flash ring.
- UI locks for debounce window ~350 ms.

4) Processing (thinking)
- A slow swirl and a faint, outward smoke pulse at 1.2 Hz while scan runs.
- If confidence rises above threshold, swirl tightens. If low, turbulence increases.

5) Resolve
- Success: scale 1.1 → settle 1.0; hue nudges toward winning archetype; a tiny radial ripple.
- Failure: brief red-tinted flash to 0.95 scale and return; show retry hint.

## Layout
- Orb centered bottom like a floating capture node. Secondary controls are tucked as small icons.
- Minimal on-screen text; rely on orb states plus a single-line status when necessary.

## Performance Budget
- Target frame time: 16 ms. Update uniforms only when deltas occur (xp_delta or profile_delta).
- Use a static snapshot on non-scan heavy screens; live Three Fiber only on Camera and Profile.

## Inputs
- Scan result: building_id, confidence, style_vector, xp_delta, profile_delta.
- Device: gps, heading, fov (telemetry for candidate filter).

## Outputs
- Visual state transitions, haptic pulses, and scan event dispatch for downstream systems.

## Constants (suggested)
- Press scale target 1.08 (120 ms in), release rebound 1.05 (140 ms).
- Processing swirl amplitude 0.25 → 0.1 as confidence rises.
- Success ripple radius 0.6 with 280 ms decay.

## Dependencies
- expo-camera, expo-haptics, @react-three/fiber, reanimated/skia (optional), Zustand store.

## Risks
- Over-animated states on low-end hardware; guard by capping live materials to essential uniforms only.

