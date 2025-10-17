# Quests: Personalized Logic

## Summary
Quest selection is seeded by the user’s current taste vector, novelty, and city coverage. Keep it light-touch and optional.

## Scoring
score(quest) = 0.45 * archetype_alignment + 0.25 * novelty_gain + 0.2 * feasible_within_time + 0.1 * randomness

## Rules
- Max 3 active quests per user.
- Prefer quests that fill underrepresented archetypes in the user’s history.
- Cooldowns prevent repetition fatigue.

