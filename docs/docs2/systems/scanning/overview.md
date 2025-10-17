# Scanning System Overview

## Summary
The scanning system is the sensory core of JINK — where the physical world meets the digital aesthetic engine. It lets users point their phone at a building, capture its image, and instantly identify it through a CLIP-based recognition pipeline enriched by location and orientation data. Each successful scan triggers XP gains, orb reactions, and aesthetic drift.

## Purpose
To provide a frictionless, camera-first interface that converts the physical act of looking into structured data: identify buildings, enrich user profiles, and feed XP and orb systems.

## System Architecture
| Layer | Function |
|-------|-----------|
| Camera Module | Built with `expo-camera` and `react-native-vision-camera`. Captures image and orientation. |
| Sensor Layer | Uses GPS, compass, and magnetometer to define a cone of vision. |
| Recognition Engine | Supabase Edge Function `/scan/identify` filters nearby buildings and ranks via CLIP embeddings. |
| Data Layer | Writes entries to `scans`, `xp_transactions`, and `passport_entries`. |
| Feedback Layer | Orb pulse animation and haptic feedback confirm successful recognition. |

## Data Flow
Camera Capture → Cone of Vision (GPS + Heading) → Supabase /scan/identify → Building Match (CLIP) → Update Scans + XP → Orb Pulse → Stamp + Passport

## Inputs / Outputs
Inputs: camera image, GPS, heading, FOV, user_id  
Outputs: building_id, confidence, metadata, xp_delta, stamp_awarded, profile_delta

## Supabase Tables Used
- `buildings` — canonical building data and aesthetic vectors  
- `scans` — every recognition event with metadata  
- `xp_transactions` — tracks earned XP  
- `passport_entries` — records first-time scans  
- `profiles` — stores and updates user archetype vectors  

## Edge Function `/scan/identify`
Input: `{ user_id, image, gps, heading, fov }`  
Output: `{ building, confidence, stamp_awarded, xp_delta, profile_delta }`

## Implementation Notes
- CLIP runs remotely; client sends preprocessed vectors.  
- Haptic feedback on scan confirmation.  
- Confidence thresholds can adjust XP rewards.  
- Orb pulse color corresponds to archetype drift.

## Dependencies
expo-camera, expo-sensors, expo-location, Supabase Edge Functions, CLIP API, Zustand, React Three Fiber.

## Open Questions
- Integrate exa.ai for richer text metadata.  
- Batch-sync scans offline.  
- Refine CLIP confidence weighting.

> *Every scan is a dialogue between your eye and the built world.*
