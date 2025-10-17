# Derive: Algorithm

## Summary
Greedy time-constrained path construction with weighted stop scoring.

## Stop Score
S = wA * archetype_affinity + wN * novelty + wD * distance_penalty + wR * randomness + wC * cluster_density

- archetype_affinity: cosine(V_user, S_building)
- novelty: 1 if not stamped, else 0
- distance_penalty: negative coefficient of meters from current node
- randomness: uniform noise in [0,1] scaled by user knob
- cluster_density: favors areas with multiple high-quality candidates

## Path Construction
1) Initialize at start_geo
2) While time budget remains:
   - score candidates within radius
   - pick top, append to path, update remaining time
3) Output polyline and stops

## Notes
- Cache candidate sets in walk_optimized_locations per neighborhood
- Always include optional “bail out” back-to-start
