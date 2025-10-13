# XP System: Economy Tuning

## Summary
Defines how XP, time, and reward pacing balance to sustain long-term engagement.

## Principles
1. Keep 80% of XP accessible via scanning.
2. Avoid exponential grind; prioritize steady curiosity.
3. Weekly XP goal: 300–500 average for active users.
4. Orb feedback tuned to prevent habituation.

## Calibration Variables
- Base XP: 25
- Walk multiplier: 1.2
- Quest multiplier: 2.0

## Monitoring
Use Supabase analytics to detect flattening engagement curves and rebalance.

> *Good economies reward attention, not obsession.*


# XP Economy Tuning (Expanded)

## Summary
The XP economy is tuned for discovery, not addiction. It rewards consistent exploration but caps repetition. Pro users gain **XP efficiency multipliers** and access to parallel creative economies.

## Economy Structure
1. **Acquisition:** XP gained through scanning, quests, dérives, and contributions.
2. **Transformation:** XP converted to creative tokens (Deep Dive Credits).
3. **Consumption:** Credits used for AI-driven building analyses or enhanced dérives.

## XP Multipliers
| Condition | Free | Pro |
|------------|------|------|
| Standard Scan | 1.0x | 1.2x |
| Verified Contribution | 1.0x | 1.4x |
| Quest Completion | 1.0x | 1.3x |
| Dérive Streak | 1.0x | 1.25x |

## Deep Dive Credits
Every 1000 XP grants 1 credit.
- Credits unlock AI reports, stylistic insights, or generative visuals.
- Unused credits roll over; no monetary conversion.

## Anti-Grind Logic
- XP gain rate capped at 10 events/minute.
- Duplicate scans within cooldown yield reduced XP (0.3x).

## Pacing Targets
| Session Length | Avg XP | Intent |
|----------------|---------|--------|
| 10 min | 150–250 | micro walk |
| 30 min | 400–600 | normal derive |
| 60+ min | 800–1000 | city session |

