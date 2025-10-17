# Loading Transitions and Screen Hand-offs

## Summary
Unify motion language across major transitions so the app feels alive without feeling busy.

## Principles
- Never teleport; hint directionality.
- Orb is the anchor; it should lead your eye during transitions.

## Patterns
- Home → Camera: orb grows and settles into capture node; background blurs briefly to focus attention.
- Scan → Result: ripple from orb center, card rises from bottom with a slight spring.
- Result → Derive: orb drifts to map center then shrinks to a locator pulse.

## Timing
- In transitions 160–220 ms; out transitions 120–160 ms.
- Keep at most two simultaneous animated properties per element.

