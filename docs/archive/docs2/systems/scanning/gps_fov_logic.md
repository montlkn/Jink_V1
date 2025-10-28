# Scanning: GPS & Field of Vision Logic

## Summary
Defines how GPS, magnetometer, and gyroscope combine to produce a spatial filter for candidate buildings.

## Components
- **GPS:** position (lat/lon)
- **Compass:** heading angle
- **FOV:** cone width (default 60°)

## Algorithm
1. Create a sector-shaped bounding region centered on user position.
2. Query buildings within radius (e.g., 100m) from Supabase PostGIS.
3. Filter buildings by heading alignment with cone angle.
4. Pass candidates to CLIP pipeline.

## Parameters
- radius: 75–150m (adaptive to density)
- cone angle: 50°–70° depending on device
- refresh interval: 2s for scanning UI

> *Space narrows the world into focus.*
