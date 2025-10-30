# INTEGRATION: how stamps, XP, achievements, visas, and quests compose

## Design principles
- **XP is the connective tissue**: everything that matters funnels XP. Stamps and achievements are durable recognition and can also award XP or entitlements. Visas gate features or regions. Quests are the short loops that feed XP and collectibles. :contentReference[oaicite:34]{index=34}

## Interaction map (high level)
1. **User performs action** (scan / derive / review / share).  
2. **Trigger Layer** captures event and builds an `event_uuid`. `update_quest_progress` and `/xp/update` are called. Both are idempotent. :contentReference[oaicite:35]{index=35}  
3. **XP transaction**: `award_xp` inserts into `xp_transactions`, updates profile totals and level via `calculate_level`. If level increased, `event_level_up` is emitted. :contentReference[oaicite:36]{index=36}  
4. **Quest progress**: If event type maps to a quest target, `quest_progress` is updated. On completion: award XP, grant quest-stamp, check achievements, emit `event_quest_completed`. :contentReference[oaicite:37]{index=37}  
5. **Stamps & Achievements**: `user_stamps` and `user_achievements` are written atomically with the reward flow. Award metadata includes rarity and serial number for rare/legendary items. Collection completion triggers collection bonuses (XP or entitlements). :contentReference[oaicite:38]{index=38}  
6. **Visas**: When granting gated features, verify `user_visas` validity and signature. Visas can be an input condition for quest eligibility or stamp issuance for region-limited quests. :contentReference[oaicite:39]{index=39}

## UX scenarios

### Free user completes a daily quest
- UI shows progress update. On completion:
  - `award_xp(+250)` -> orb pulse and level calc.  
  - `user_stamps` gets quest stamp.  
  - If early-bird or streak bonus applies, multiplier applied.  
  - If XP spend later reduces total below level threshold, free-tier feature decay may occur. :contentReference[oaicite:40]{index=40}

### Pro user completes weekly quest
- Same flow. Additionally:
  - Pro XP multiplier applied (e.g., 1.2x or 2x depending on config).  
  - If crossing milestone, grant Deep Dive Credit(s) and creator unlocks. :contentReference[oaicite:41]{index=41}

### Missable quest (seasonal)
- Display countdown. If user completes during window: award rare quest-stamp, possibly a missable achievement. If not, log as missed.

## Metrics & Monitoring
- Mandatory: XP/day, quest completion %, stamp issuance by rarity, legendary issuance, level-up rates, anti-abuse flags. Route to Datadog/Prometheus. :contentReference[oaicite:42]{index=42}

## Edge cases & policies
- **Offline**: Accept event with `event_uuid`; server reconciles and idempotently applies.  
- **Rollback**: For fraud or abuse, revoke stamps/achievements and append a revocation audit row. XP rollbacks should not remove entitlements already granted (docs require unlocks to persist). :contentReference[oaicite:43]{index=43}  
- **Anti-grind**: Cap events/minute and reduce duplicate-scan XP. Use heuristics to detect farms. :contentReference[oaicite:44]{index=44}

## Example payloads
- `event_quest_completed`:
```json
{
  "user_id": "u_987",
  "quest_id": "q_123",
  "completed_at": "2025-10-07T15:23:00Z",
  "xp_awarded": 250,
  "stamps_awarded": [{"id":"s_555","type":"quest"}],
  "achievements": []
}
