# XP Milestones for Pro Users (Creative Unlocks)

## Purpose
Pro users should feel tangible creative growth as they gain XP.
These unlocks reward exploration and contribution without adding grind or competition.

## Philosophy
- Keep it useful, not gamey.
- Each milestone should extend capability, not vanity.
- Milestones are tied to total XP, not time or subscription age.

## Unlock Table
| Total XP | Unlock | Description |
|----------|--------|-------------|
| 1 000 | Deep Dive Credits x1 | Access detailed AI building reports. Earn +1 per additional 1000 XP. |
| 2 500 | Custom Derives | Create and save personalized routes; share privately. |
| 5 000 | Stamp Designer | Compose personal stamp styles (color + icon). |
| 7 500 | Public Derives | Publish routes for others; visible after staff review. |
| 10 000 | Aesthetic Export | Export your profile vector as visual (orb state, color palette). |
| 15 000 | Orb Modulation | Orb gains reactive shader layer reflecting your top archetype blend in real time. |

## Integration with Entitlements
Each unlock toggles a boolean or counter inside entitlements:

{
  "deep_dive_credits": 3,
  "custom_derives": true,
  "stamp_designer": true,
  "public_derives": false,
  "aesthetic_export": false,
  "orb_modulation": true
}

Edge function /xp/update checks for crossing thresholds and appends new entitlements.
Client shows a small toast: "Unlocked: Custom Derives."

## Visual Feedback
- Unlock events pulse the orb in gold for 1 s.
- Newly unlocked actions get a shimmering outline for 24 h.

## Safeguards
- Prevent spam by debouncing entitlement recalculations.
- XP rollbacks never remove unlocks already granted.
- Upgrades sync on next login if user was offline.

## Future Extension
- Allow Pro users to trade unused Deep Dive credits for "guest passes."
- Add subtle orb tint per milestone tier for visual bragging rights.
