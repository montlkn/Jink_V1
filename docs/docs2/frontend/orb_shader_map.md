# Orb Shader Structure and Color Mapping

## Summary
Defines shader layers, uniforms, and color mapping from aesthetic vector to visual state. Ensures consistent appearance across screens.

## Layers
- Base sphere: simple BRDF or lambertian with subtle specular.
- Noise displacement: 3D simplex noise; amplitude tied to confidence inverse.
- Rim light: angle-based intensity; strengthens on XP pulses.
- Ripple layer: radial expansion for success events.

## Uniforms
- uTime: seconds since mount for animation.
- uScale: base scale multiplier on XP deltas.
- uTurbulence: 0 to 1; inversely tied to profile confidence.
- uHuePrimary: 0–360 based on top archetype.
- uHueSecondary: accent hue from second archetype.
- uPulse: 0–1 transient for event ripple.
- uEnergy: composite of recent XP and drift magnitude.

## Color Mapping
- Classicist 36, Romantic 24, Stylist 310, Modernist 200, Industrialist 20, Visionary 270, PopCulturalist 340, Vernacularist 110, Austerist 45.
- Blend primary to secondary by their normalized weights; clamp saturation on low confidence to avoid muddy visuals.

## Performance
- Cap fragment shader complexity; prefer precomputed LUTs for hue-to-RGB.
- On low-end devices, freeze uTime updates and drive only uScale and uHuePrimary changes.