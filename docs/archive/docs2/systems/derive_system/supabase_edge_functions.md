# Derive: Supabase Edge Functions

## Overview
- /route/derive: POST user_id, start_geo, duration_minutes, randomness → returns polyline + stops
- /route/preview: GET with params for a quick list of candidates (no polyline) for UI previews
- /route/complete: POST walk stats; awards completion XP and updates novelty flags

## Implementation Notes
- Use PostGIS for distance and bounding operations
- Clamp the number of candidate buildings for consistent latency
