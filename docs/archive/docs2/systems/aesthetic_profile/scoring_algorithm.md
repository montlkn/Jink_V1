# Aesthetic Profile: Scoring Algorithm

## Summary
Maintains a normalized vector V of size 9. Seed via quiz; update online with user actions.

## Online Update
On scan of a building with style vector S:
1) V = V + α * normalize(S)
2) Apply affinity boosts and opposition dampening
3) Renormalize to sum = 1 (for UI) while retaining raw totals for analytics
4) Update confidence c in [0,1] using moving average of consistency

Suggested α: 0.5 for first-time style, 0.2 otherwise. Confidence increases when updates align with current top-3; decreases when contradictory.

## Subtype Resolution
- Infrastructuralist: Industrialist > 40 and Infrastructuralist subscore > 60% of Industrialist
- Naturalist: Vernacularist > 40 and Naturalist subscore > 60% of Vernacularist
