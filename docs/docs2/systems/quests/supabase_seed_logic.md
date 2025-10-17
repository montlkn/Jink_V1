# Quests: Supabase Seed Logic

## Summary
Defines seeding strategy and backend structure for quest rotation.

## Tables
- `quests` — definitions (id, name, type, reward, duration)
- `user_quests` — active quests for each user (quest_id, started_at, completed_at)

## Rotation
Edge function `/quests/rotate` seeds new quests daily based on active user archetype weights.

## Notes
- Keep total active quests ≤ 3 per user
- Ensure diversity in type
