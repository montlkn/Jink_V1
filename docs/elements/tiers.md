# TIERS — Free vs Paid (high-level)

## Design goals
- Free: playable and feels rewarding. XP is the progression path to richer content. Daily streaks matter.  
- Paid (Pro): removes grind and unlocks creative/advanced features. Pro preserves entitlements and grants utility, not pure power.

## Free (default)
- Scan limit per day set by level: `daily_scan_limit = floor(Level / 2) + 2`.
- XP gates feature depth. Example: Level 1 → basic scan info. Level 3 → style analysis. Level 5 → historical context. (Use ladder mapping.)
- Spending XP to unlock writeups or temporary deeper content allowed. Spending can reduce level and thus remove level-based features (feature decay).
- Daily streaks boost XP and progression.

## Pro (paid)
- **Core benefits**:
  - Unlimited scans (or high cap).
  - No feature decay. Features unlocked by level remain even if XP spent.
  - XP multiplier (configurable 1.2–2.0).
  - Deep Dive Credits: 1 credit per 1000 XP.
  - Creator tools: publish derives, submit buildings, create quests.
  - Advanced features: Deep reports, exports, batch queries.
- **UX**: Pro shows Creator unlocks and allows gifting credits.

## Pricing (ballpark from prior doc)
- **Explorer** (light paid) — access to short writeups and modest perks. Suggested $4.99/mo.
- **Deep / Pro** — in-depth reports, creator tools. Suggested $14.99/mo.
- **Unlimited / Enterprise** — unlimited scans, early access, batch queries. Suggested $24.99/mo.
- Pay-per-report add-on for non-subscribers ($2–5 per deep writeup) or XP for normal writeup after 4 writeup a week limit is reached.

## Implementation notes
- Distinguish Pro vs Free entitlements in `profiles.entitlements`.
- Entitlements toggles: `unlimited_scans`, `xp_multiplier`, `deep_dive_credits`, `creator_tools`.
- Feature gating checks consult `profiles.level` and `entitlements`. Pro users bypass XP gating for feature access.

## UX flows
- When Free hits a gate show: “Unlock full writeup for 500 XP or upgrade to Pro for permanent access.”
- Show conversion benefits in context: Deep Dive value, and creative tools.
