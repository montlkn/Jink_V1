# Aesthetic Profile: Quiz Logic

## Summary
An 18-item assessment (15 visual + 3 text) initializes the user’s archetype vector. Each question contributes primary (+5), secondary (+2), and optional contradiction (-1) scores.

## Structure
- Q1–3: Master planning scale
- Q4–8: Urban/building scale
- Q9–12: Interior scale
- Q13–15: Object/detail scale
- Q16–18: Text/philosophy

## Scoring
Primary +5, Secondary +2, Tertiary +0.5 (rare), Contradiction -1. Normalize to a 0–100 scale if needed for UI.

## Outputs
- primary_archetype
- secondary_archetype
- vector (dict of 9 archetypes)
- subtype seeds (industrialist→infrastructuralist, vernacularist→naturalist)
- confidence (based on decisiveness, cross-scale consistency, category separation)

## Implementation Notes
- Persist raw answers for future reweighting
- Version the quiz; store last_quiz_version on profile
