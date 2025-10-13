import os

BASE = "/Users/lucienmount/Arch_App_V2/architecture-app/docs/docs2/systems/xp_system"

DOCS = {
"overview.md": """# XP System Overview (Enhanced)

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

""",

"xp_core_mechanics.md": """# XP Core Mechanics (Updated)

## Summary
XP accumulates linearly but affects different unlock layers depending on user type. It is tracked transactionally and reflected visually through orb animations, profile level, and creative rights.

## XP Storage
- xp_transactions table: immutable event ledger.
- profiles.total_xp: rolling total for quick access.
- profiles.level: discrete progression marker.

## Level Thresholds
Level_n = 200 * n^1.5 (same curve for both Free and Pro).
Pro users gain expanded utility at each tier.

| Level | Free Unlock | Pro Unlock |
|-------|--------------|-------------|
| 1 | Scan + Passport | Orb customization |
| 2 | Personal dérive | Deep Dive Credit x1 |
| 3 | Style Quests | Custom derive route |
| 4 | Contribution rewards | Upload buildings |
| 5 | Aesthetic stats | Create public quests |
| 6 | Badge visualization | 3D orb modulation |
| 7+ | Stability tuning | Full creative suite |

""",

"economy_tuning.md": """# XP Economy Tuning (Expanded)

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

""",

"pro_usage.md": """# XP Pro Usage System

## Summary
Pro users unlock practical creative powers as they progress. XP becomes both a proof of participation and a creative resource.

## Core Advantages
| Category | Description |
|-----------|--------------|
| Deep Dive Credits | Convert XP to AI-enhanced insights |
| Custom Derives | Generate themed dérives or share routes |
| Orb Customization | Color modulation, pattern, responsiveness |
| Building Upload | Add new entries verified by peers |
| Quest Authoring | Design small challenges or theme routes |
| Contribution Multiplier | Verified data earns more XP |

## Notes
- All unlocks remain aesthetic or creative, never pay-to-win.
- Pro features emphasize personal expression and contribution, not hierarchy.

> *XP measures curiosity; Pro turns it into authorship.*

""",

"creator_unlocks.md": """# XP Creator Unlocks

## Summary
Defines the progression ladder from passive explorer to active contributor. Unlocks are cumulative and remain even if subscription lapses (limited access).

## Unlocks
| Tier | Requirement | Unlock |
|------|--------------|--------|
| 1 | Level 2 | Personal Derives |
| 2 | Level 3 | Thematic Quests |
| 3 | Level 4 | Building Submission |
| 4 | Level 5 | Orb Modulation (visual expression) |
| 5 | Level 6 | Public Quest Authoring |
| 6 | Level 7 | Derive Series Creation |
| 7 | Level 8 | Generative Map Overlays |

## Creator Ethics
- All public contributions undergo peer moderation.
- XP and credibility jointly determine creative trust.

""",
}

def append_or_create(base, docs):
    os.makedirs(base, exist_ok=True)
    for name, content in docs.items():
        path = os.path.join(base, name)
        if os.path.exists(path):
            with open(path, "a", encoding="utf-8") as f:
                f.write("\n\n" + content)
        else:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
    print(f"✅ Appended or created {len(docs)} XP documentation files at {base}")

if __name__ == "__main__":
    append_or_create(BASE, DOCS)
