# Past Walk Page & Jink Summary (Nolli Map)

## Summary
A single screen combining personal history and visual memory.
Users see their past walks and a black-and-white Nolli-style city map that reveals only the regions they’ve explored.
It’s the visual embodiment of "what you’ve seen."

## Layout Hierarchy
1. Past Walks Page
   - Carousel of walks (most recent first).
   - Each tile shows the generated drawing + duration + XP earned.
   - Tap -> opens Jink Summary Screen for that walk.

2. Jink Summary Screen
   - Header: Walk name, date, XP gained.
   - Body: list of visited buildings (cards with photos and blurbs).
   - Footer: "View on Map" -> opens the Nolli-style city view.

3. Nolli Map View
   - 2D black-and-white rendering of the city (vector or raster).
   - Only visited buildings are visible:
     - Each is surrounded by a feathered circle (soft mask radius ~75 m).
     - Connection lines join the sequence of buildings in that walk.
   - Unexplored areas are dimmed under a haze overlay.
   - As the user explores more buildings, the map gradually clears, mimicking exploration in EU4-style fog-of-war.

## Data Inputs
- passport_entries table for visited buildings.
- Building coords -> projected to map coordinates.
- User city center from last derive session.
- Optional cached map tiles or vector basemap.

## Rendering Logic
1) Preload map tile layer in grayscale (desaturated).
2) For each visited building:
   - draw feathered radial gradient mask at its position.
   - opacity = min(1.0, visit_count / 3).
3) Connect consecutive visits from the same walk with semi-transparent line.
4) Overlay subtle fog mask on unvisited areas (alpha 0.65).
5) When zooming:
   - Reveal more detail, fade-in building outlines.
   - At highest zoom, show names; at lowest, only clusters.

## Interactions
| Gesture | Action |
|--------|--------|
| Tap building | Opens building info card (same as scan result) |
| Pinch | Zoom in/out (fog dynamically recalculated) |
| Swipe left/right | Switch between walks |
| Long press | "Revisit walk" CTA -> triggers derive route from current location |

## Performance
- Use off-screen canvas / WebGL layer for mask compositing.
- Tile cache (256 px) with fog alpha baked.
- p95 render target: <= 30 ms per frame on mid device.

## Orb Integration
- When the map opens, orb glows faintly at map center.
- As user hovers over a building or zooms near it, orb pulses with that building’s archetype hue (from its style vector).
- When a new area is revealed for the first time, orb emits a small outward ripple and user earns +5 XP "Explorer bonus."

## Aesthetic Reference
- Base palette: white background, black fill for mass, light gray streets.
- Feather masks: radial falloff, multiply blend.
- Haze overlay: low-contrast bluish tint, animated noise (slow drift).

## Future Hooks
- Toggle between "All walks" (aggregate map) and single walk path.
- Option to export current map view as image for sharing.
