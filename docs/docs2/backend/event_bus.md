# Backend Event Bus

## Summary
Lightweight event topics so subsystems react to user actions consistently without spaghetti dependencies.

## Topics
- scan.completed: payload user_id, building_id, confidence, xp_delta, profile_delta.
- walk.completed: user_id, walk_id, stops, xp_delta.
- quest.completed: user_id, quest_id, xp_delta.
- contribution.verified: user_id, contribution_id, credibility, xp_delta.

## Delivery
- Prefer Supabase real-time channels; fall back to polling if needed.
- Log to an events table for debugging and replays.

