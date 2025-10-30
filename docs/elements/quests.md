# QUESTS

## Purpose
Quests are primary short-term engagement loops. They produce validation metrics and collectible stamps. They include rolling events and multi-week chains.

## Types & behavior
- **Daily**: small, repeatable. Reset daily. XP ~250, early-bird bonus if completed before specified hour.
- **Weekly**: larger targets. XP ~1000 with perfect-week bonuses.
- **Event / Seasonal**: limited-time quests with unique quest stamps. Missable.
- **Quest Chains**: multi-week series culminating in a high-value achievement (e.g., 4-week Manhattan Master).

## Rolling events & validation
- Rolling quests: rotate or auto-generate new quests for every user or region. Use completion rate as validation metric to tune difficulty.
- Quest Chains: track chain completion as a validation metric for engagement and retention. A chain’s completion % is a KPI for success.

## Lifecycle
1. **Assignment**: Server assigns active daily/weekly quests at login or via `getActiveDailyQuest()`.
2. **Progress**: Events (scan/derive/review) call `update_quest_progress(user_id, quest_id, delta, event_uuid)`. Progress is updated idempotently.
3. **Completion**: On completion award XP, grant quest stamp, check achievements, and emit `event_quest_completed`.
4. **Expiration**: Missable quests expire at `active_until`.

## Rewards model
- XP primary.
- Quest stamps (rare).
- Chance-based rare stamps with pity counters.
- Chain achievements and titles.

## Metrics
- Track: assignment → participation → completion → dropoff by quest.
- Use completion rate as primary validation metric. For chains measure retention and consecutive-week completion.

## Telemetry & anti-abuse
- `event_quest_progress {user_id, quest_id, delta, new_progress, completed}`
- Rate-limit progress events and use `event_uuid` for idempotency.
- Detect farming via bursts or identical device signatures.

## UX
- Quests list with progress bars and countdown.
- For missable quests show countdown and explicit “missable” label.
