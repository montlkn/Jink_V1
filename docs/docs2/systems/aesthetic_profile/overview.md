# Aesthetic Profile: Overview

## Summary
The aesthetic profile models a user’s architectural taste across nine archetypes and two subtypes. It starts with the onboarding quiz and evolves with every scan and walk, informing dérive generation and orb behavior.

## Purpose
Translate ambiguous aesthetic preference into a stable, queryable vector that shapes routes, rewards, and visuals.

## Inputs / Outputs
Inputs: quiz responses, scan style vectors, completion events
Outputs: archetype vector, subtype flags, confidence, change deltas for the orb

## Dependencies
- Quiz logic
- Scanning style vectors
- XP transactions (for confidence shaping)
- Orb visualization

## Data Flow
Quiz seed vector → store in profile → on scan, nudge vector toward matched styles → update subtype flags and confidence → notify orb and derive system

## Implementation Notes
- Vector is JSONB with keys for 9 core archetypes
- Confidence increases with consistent behavior, decreases with contradictory choices
- Subtype promotion rules are applied after each update

## Open Questions / Future Work
- Long-term drift decay
- Seasonality (time-of-day, weather) as soft modifiers
