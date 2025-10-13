# Scanning: XP Integration

## Summary
Each scan event yields XP according to recognition confidence, novelty, and context (standalone or during derive).

## XP Rules
| Condition | XP | Notes |
|------------|----|-------|
| First-time scan | 25 | New stamp added |
| Repeat scan | 5 | reinforcement bonus |
| During derive | ×1.2 multiplier | context bonus |

## Implementation
- XP write handled via `/xp/update`
- Transaction recorded in `xp_transactions`
- Orb pulse triggered with color mapping to archetype drift

> *Recognition becomes growth.*
