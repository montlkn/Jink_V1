# JINK: Architecture Overview

## Summary
JINK is an experiential architecture discovery platform disguised as a mobile game. It transforms the city into an interactive field of aesthetic data: users scan buildings, collect “stamps,” evolve a dynamic orb that represents their taste, and go on algorithmically personalized dérives.

The app blends computer vision, geospatial data, and personalized aesthetic logic to build an evolving map of architectural consciousness. Technically, it’s a hybrid of real-time CLIP inference, Supabase-driven state, and a React Native + Expo front end.

## Purpose
To make architectural exploration playful, personal, and data-rich—a visual search dictionary and aesthetic journal in one.

It answers:
1. **What am I looking at?** – camera-based recognition  
2. **What does this say about my taste?** – archetype profiling + orb  
3. **Where should I go next?** – dérive generator based on aesthetic profile

## System Architecture
| System | Description |
|--------|-------------|
| Scanning Engine | CLIP embeddings + GPS cone of vision to identify buildings |
| Aesthetic Profile Engine | Tracks user preferences across nine archetypes |
| Orb Visualization | Live 3D visualization responding to XP and drift |
| XP System | Gamified progression loop |
| Passport | Collectible log of scans, lists, and achievements |
| Derive System | Generates personalized walking routes |
| Supabase Backend | Central database and edge functions |
| exa.ai | Semantic enrichment for building metadata |

## Data Flow
Camera → CLIP + Geo → Supabase Edge Function → Building Match → XP + Drift → Orb Pulse → Stamp → Passport → Derive → Repeat

## Tech Stack
React Native + Expo • Three.js / @react-three/fiber • Supabase (Postgres + Edge Functions)  
exa.ai • CLIP • Zustand • React Navigation • AsyncStorage  

## Implementation Notes
- `profiles` table stores aesthetic vectors  
- `/scan/identify` handles scan → match → XP write  
- `/route/derive` generates dérive paths  
- Orb rendered via Three Fiber, animated by XP deltas  

## Open Questions
Offline caching • community contributions • orb sound feedback • contextual derives

> *JINK doesn’t just show you buildings—it teaches you how you see.*
