# Derive: Randomness Weights

## Summary
Randomness prevents filter bubbles and helps in sparse datasets. It is tunable by the user.

## Mapping
- randomness = 0 → pure affinity, deterministic
- randomness = 0.3 → light exploration
- randomness = 0.6 → balanced exploration
- randomness = 1.0 → high serendipity, near-random within safety bounds

## Safety
Never select buildings below a minimum data quality threshold. Respect distance and time constraints regardless of randomness.
