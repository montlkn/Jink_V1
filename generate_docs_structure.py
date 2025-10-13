import os

BASE = "/Users/lucienmount/Arch_App_V2/architecture-app/docs/docs2"

DOCS = {
    "systems/scanning/clip_pipeline.md": """# Scanning: CLIP Pipeline

## Summary
Outlines how JINK processes images through CLIP (Contrastive Language–Image Pretraining) to identify architectural features and match them to the database.

## Pipeline
1. Capture image → resize and normalize
2. Send to remote CLIP inference API
3. Receive 512-d embedding vector
4. Compare with stored building vectors using cosine similarity
5. Return top candidate (confidence ≥ 0.7)

## Notes
- Image preprocessing: 224×224, mean/std normalization
- Model: ViT-B/32 baseline, extendable to custom fine-tuned weights
- Store embeddings in Supabase `buildings` table

> *The eye sees, CLIP remembers.*
""",

    "systems/scanning/gps_fov_logic.md": """# Scanning: GPS & Field of Vision Logic

## Summary
Defines how GPS, magnetometer, and gyroscope combine to produce a spatial filter for candidate buildings.

## Components
- **GPS:** position (lat/lon)
- **Compass:** heading angle
- **FOV:** cone width (default 60°)

## Algorithm
1. Create a sector-shaped bounding region centered on user position.
2. Query buildings within radius (e.g., 100m) from Supabase PostGIS.
3. Filter buildings by heading alignment with cone angle.
4. Pass candidates to CLIP pipeline.

## Parameters
- radius: 75–150m (adaptive to density)
- cone angle: 50°–70° depending on device
- refresh interval: 2s for scanning UI

> *Space narrows the world into focus.*
""",

    "systems/scanning/xp_integration.md": """# Scanning: XP Integration

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
""",

    "systems/scanning/orb_signals.md": """# Scanning: Orb Signals

## Summary
The orb translates system events into kinetic and chromatic responses. It acts as emotional feedback for scanning outcomes.

## Input Signals
| Event | Signal |
|--------|---------|
| Successful scan | Pulse scale ↑1.05, color → dominant archetype |
| New stamp | Burst ripple + XP color accent |
| XP gain | Glow intensity modulated by delta |
| Profile drift | Subtle hue transition over 2s |

## Implementation
- Controlled via `orb/pulse` hook
- Rendered with Three.js shaders in @react-three/fiber

> *The orb is your second eye.*
""",

    "systems/xp_system/xp_core_mechanics.md": """# XP System: Core Mechanics

## Summary
Defines the underlying rules of XP gain, persistence, and synchronization.

## XP Events
- Building scans
- Walk completions
- Quest completions
- Memory creations

## Storage
- Supabase `xp_transactions` (immutable ledger)
- `profiles.total_xp` and `profiles.level` for quick reads

## Sync
XP updates emitted as real-time events to refresh UI instantly.

> *Progress should always feel immediate.*
""",

    "systems/xp_system/leveling_curve.md": """# XP System: Leveling Curve

## Summary
Defines mathematical curve mapping XP to level progression.

## Formula
XP_required(level) = base * level^1.5

Example (base = 200):
| Level | XP | Cumulative |
|--------|----|------------|
| 1 | 0 | 0 |
| 2 | 200 | 200 |
| 3 | 600 | 800 |
| 4 | 1200 | 2000 |
| 5 | 2000 | 4000 |
| 6 | 3200 | 7200 |

## Notes
- Early progression fast to encourage scanning
- Linear boost plateaus to maintain curiosity

> *Leveling is rhythm, not race.*
""",

    "systems/xp_system/transactions_and_rewards.md": """# XP System: Transactions & Rewards

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
""",

    "systems/xp_system/economy_tuning.md": """# XP System: Economy Tuning

## Summary
Defines how XP, time, and reward pacing balance to sustain long-term engagement.

## Principles
1. Keep 80% of XP accessible via scanning.
2. Avoid exponential grind; prioritize steady curiosity.\n3. Weekly XP goal: 300–500 average for active users.
4. Orb feedback tuned to prevent habituation.

## Calibration Variables
- Base XP: 25
- Walk multiplier: 1.2
- Quest multiplier: 2.0

## Monitoring
Use Supabase analytics to detect flattening engagement curves and rebalance.

> *Good economies reward attention, not obsession.*
""",
}

def write_docs(base: str, docs: dict):
    for rel_path, content in docs.items():
        full_path = os.path.join(base, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"✅ Wrote {len(docs)} missing documentation files to {base}")

if __name__ == "__main__":
    write_docs(BASE, DOCS)