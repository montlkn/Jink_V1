# Orb Visualization: Behavior Mapping

## Summary
The orb is a living visualization driven by XP and aesthetic drift. It communicates identity (color composition), momentum (scale pulses), and certainty (turbulence vs smoothness).

## Inputs → Visuals
- XP delta → brief scale pulse and radial ripple
- Primary archetype → dominant hue
- Secondary archetype → accent hue band
- Confidence ↑ → lower noise, tighter surface
- Confidence ↓ → higher noise, lively perturbations
- Subtype flags → embedded motif (subtle geometry overlay)

## Implementation Notes
- Use @react-three/fiber with lightweight shader material
- Keep live orb on a few screens only; use static or Lottie snapshots elsewhere
- Provide deterministic color mapping per archetype for recognizability
