# XP System: Transactions & Rewards

## Summary
Tracks granular XP events and triggers related rewards or achievements.

## Transaction Schema
| Field | Description |
|--------|-------------|
| id | unique identifier |
| user_id | player reference |
| amount | XP gained |
| reason | e.g. scan, quest, derive_complete |
| source_id | related building, quest, or walk |
| timestamp | ISO UTC |

## Rewards
- Level-up animation
- New stamp unlock
- Orb scale ripple
- Achievement check

> *Every entry a memory of discovery.*
