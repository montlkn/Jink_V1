# STREAKS

## Purpose
Daily streaks reward consistent engagement and drive habitual app usage. They provide progressive XP multipliers that compound over time, creating a powerful retention mechanic for both Free and Pro users.

## Mechanics
- A **daily streak** counts consecutive UTC days with at least one qualifying action.
- Qualifying actions:
  - Building scan
  - Walk/dérive completion
  - Quest completion
- **Streak breaks** if a full UTC day passes without any qualifying action.
- Streak count persists across sessions and devices via server-side tracking.

## Multiplier tiers
- **3-6 days**: 1.5x XP multiplier
- **7-29 days**: 2x XP multiplier
- **30+ days**: 3x XP multiplier + "Dedicated Explorer" achievement

## Implementation
- `profiles.daily_streak_count`: current consecutive days
- `profiles.last_activity_date`: last qualifying action date (UTC)
- `profiles.streak_started_at`: timestamp when current streak began
- `update_daily_streak(user_id)`: called after qualifying actions
  - Returns: `{streak_count, is_new_day, previous_streak}`
  - Updates streak if action is first of the day
  - Resets to 1 if previous day was missed
  - No change if already active today

## XP multiplier application
- Multiplier fetched from `profiles.daily_streak_count` before awarding XP
- Applied to base XP amount: `final_xp = base_xp * multiplier`
- Logged for transparency: `"XP multiplier applied: 25 × 2.0 = 50"`
- Gracefully degrades if streak fetch fails (uses base amount)

## UI display
- **Passport home**: Streak card with flame icon
  - Flame turns orange at 3+ day streak
  - Shows current streak count
  - Displays active multiplier or encouragement message
- **Future**: Streak notifications, streak-saver offers, streak leaderboards

## Anti-abuse
- Server-authoritative: client cannot manipulate streak count
- Date comparison uses UTC to prevent timezone exploits
- Idempotent: multiple actions per day don't inflate count
- Rate limiting on qualifying actions prevents farming

## Metrics & validation
Track:
- Streak distribution histogram (how many users at each tier)
- Streak retention curves (% maintaining 3/7/30 day streaks)
- Correlation: streak length → session frequency → LTV
- Drop-off analysis: when/why streaks break

## Future enhancements
- **Streak freeze**: Pro users get 1-2 freeze tokens per month
- **Streak recovery**: One-time grace period within 24h for missed day
- **Streak challenges**: Bonus rewards for milestone achievements
- **Social streaks**: Compare streaks with friends or local explorers
