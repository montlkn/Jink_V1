# XP System Overview

## Summary
The XP System governs progression, feedback, and reward loops within JINK. It converts exploration into measurable growth and shapes how users perceive progress through the orb.

## Purpose
To reinforce exploration and aesthetic learning through immediate, consistent feedback.

## System Architecture
| Layer | Function |
|-------|-----------|
| Trigger Layer | Captures XP events (scans, walks, quests). |
| Calculation Layer | Determines XP delta based on rarity, distance, or novelty. |
| Storage Layer | Supabase tables `xp_transactions` and `profiles`. |
| Feedback Layer | Updates orb visuals, levels, and UI badges. |

## XP Flow
Event → Edge Function → XP Transaction → Profile Update → Orb Pulse

## XP Examples
| Action | XP | Description |
|--------|----|-------------|
| First-time building scan | +25 | New stamp awarded |
| Repeat scan | +5 | Reinforcement bonus |
| Completed walk | +40 | Derived from route length |
| Style-based quest | +60 | Phase 2 feature |

## Tables
- `xp_transactions`: user_id, amount, reason, source_id, timestamp  
- `profiles`: user_id, total_xp, level, archetype_vector  

## Level Curve
Level 1 → 0 XP  
Level 2 → 200 XP  
Level 3 → 600 XP  
Level 4 → 1200 XP  
Level 5 → 2000 XP  
Level 6 → 3200 XP  
Levels beyond 6 scale at +20% per tier.

## Edge Function `/xp/update`
Input:
```json
{"user_id": "uuid", "xp_delta": 25, "reason": "scan_first_time", "source_id": 42}
```
Output:
```json
{"new_level": 3, "total_xp": 640, "orb_signal": {"scale": 1.08, "color": "amber"}}
```

## Implementation Notes
- XP writes are idempotent and append-only.  
- Orb animation tied directly to `xp_delta`.  
- No XP decay in v1.

> *Progress is curiosity catching up with memory.*


# XP System Overview (Enhanced)

## Summary
XP in JINK is more than a counter — it’s the connective tissue linking curiosity, creation, and contribution. It tracks engagement across scanning, dérives, quests, and contributions, fueling both progression and creative unlocks. The system supports two tiers: **Free** and **Pro** users, both growing within the same loop but unlocking different layers of depth.

## Design Philosophy
1. **XP as curiosity index** — not power, but attention.
2. **Progression without grind** — each action has aesthetic weight.
3. **Pro users earn utility, not superiority** — more creative control, not higher stats.

## Core XP Actions
| Action | Base XP | Notes |
|--------|----------|-------|
| Building Scan | 25 | +bonus for novelty |
| Dérive Completion | 40 | proportional to stops |
| Quest Completion | 60 | dynamic based on rarity |
| Contribution Verified | 40 | credibility-weighted |
| Memory Added | 10 | per text or image |

## Tiers
- **Free Users:** progress visually through orb and passport; can earn stamps, quests, and personal dérives.
- **Pro Users:** XP doubles as **creative capital** — unlocks access to AI-driven analysis, data layers, and expressive customization.

