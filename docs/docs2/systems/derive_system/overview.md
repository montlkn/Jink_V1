# Derive (Jink) System: Overview

## Summary
Generates time-boxed walking routes that align with the user’s aesthetic vector while preserving novelty and serendipity. Accepts a randomness parameter to sprinkle discovery in sparse areas.

## Purpose
Deliver a guided yet personal city exploration loop that continuously learns from the user’s taste.

## Inputs / Outputs
Inputs: user_id, start_geo, duration_minutes, randomness
Outputs: polyline, ordered stops with ETAs and metadata

## Dependencies
- Aesthetic profile vector
- Buildings index with style vectors and coordinates
- Passport (to prefer unvisited)
