# ACHIEVEMENTS

## Purpose
Achievements are durable markers of skill, consistency, and rare accomplishments. They award XP and usually an Achievement Stamp. They are initially hardcoded and can be extended later.

## Implementation notes
- **Hardcode initial set** in `achievements_def`. Keep IDs stable and documented.
- `user_achievements` stores awarded achievements with `awarded_at`.

# Initial Hardcoded Achievements — Verifiable Set

> Conventions in verification examples:
> - `$USER` = user id parameter
> - `building_scans(user_id, building_id, created_at)` records scans
> - `derives(user_id, duration_minutes, created_at)` records derives/walks
> - `quests` and `quest_progress` as previously defined
> - `stamps` / `user_stamps` and `user_visas` used as described in specs
> - adapt SQL to your schema if names differ

---

## 1. `first_scan`
- **Name**: First Scan  
- **Purpose**: First building scanned.  
- **XP**: 25  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM building_scans WHERE user_id = $USER;`

## 2. `100_scans`
- **Name**: 100 Unique Scans  
- **Purpose**: Encourage breadth.  
- **XP**: 500  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(DISTINCT building_id) FROM building_scans WHERE user_id = $USER >= 100;`

## 3. `style_explorer:{style}`  
- **Name**: {Style} Explorer  
- **Purpose**: Visit ten buildings of the same architectural style.  
- **XP**: 200  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(DISTINCT s.building_id) FROM building_scans s JOIN buildings b ON s.building_id=b.id WHERE s.user_id=$USER AND b.style='Modern' >= 10;`
- **Notes**: This can be replicated for every style in the dataset not just one style-- a list of users visted buildings is logged for this. 

## 4. `dedicated_traveler`
- **Name**: Dedicated Traveler  
- **Purpose**: Complete a single derive/jink >= 90 minutes.  
- **XP**: 200  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM derives WHERE user_id=$USER AND duration_minutes >= 90;`

## 5. `perfect_week`
- **Name**: Perfect Week  
- **Purpose**: 7 daily quests in a row.  
- **XP**: 1200  
- **one_time**: true, **missable**: true  
- **Verify**: `Check quest_progress for seven consecutive days where completed=true;`  
  *(Implementation: find a 7-day window with daily quest completed each day.)*

## 6. `dawn_scanner`
- **Name**: Dawn Scanner  
- **Purpose**: Complete a daily quest before 08:00 local time.  
- **XP**: 150  
- **one_time**: true, **missable**: true  
- **Verify**: `SELECT COUNT(*)>0 FROM quest_completions qc JOIN users u ON qc.user_id=u.id WHERE qc.user_id=$USER AND (qc.completed_at AT TIME ZONE u.timezone)::time < '08:00';`

## 7. `season_champion`
- **Name**: Season Champion  
- **Purpose**: Collect all Season 1 quest stamps.  
- **XP**: 10000  
- **one_time**: true, **missable**: true  
- **Verify**: `SELECT COUNT(*) = (SELECT COUNT(*) FROM stamps_def WHERE series='Season1' AND is_quest_variant) FROM user_stamps WHERE user_id=$USER AND stamp_id IN (SELECT id FROM stamps_def WHERE series='Season1' AND is_quest_variant);`

## 8. `dedicated_explorer`
- **Name**: Dedicated Explorer  
- **Purpose**: 30-day qualifying-action streak.  
- **XP**: apply 3x streak multiplier (plus one-time award config)  
- **one_time**: true, **missable**: false  
- **Verify**: `Find 30 consecutive UTC days with at least one qualifying action (scan or derive) per day for $USER.`

## 9. `first_visa`
- **Name**: First Visa  
- **Purpose**: Earn your first neighborhood visa (new visa behavior).  
- **XP**: 100  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM user_visas WHERE user_id=$USER;`

## 10. `neighborhood_local:{neighborhood}`
- **Name**: Neighborhood Local  
- **Purpose**: Visit 10 distinct buildings within a named neighborhood (visa-style).  
- **XP**: 150  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(DISTINCT s.building_id) FROM building_scans s JOIN buildings b ON s.building_id=b.id WHERE s.user_id=$USER AND b.neighborhood='Bedstuy' >= 10;`

## 11. `first_review`
- **Name**: First Review  
- **Purpose**: Submit first building review.  
- **XP**: 50  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM reviews WHERE user_id=$USER;`

## 12. `100_upvotes`
- **Name**: Popular Reviewer  
- **Purpose**: Receive 100 upvotes across reviews.  
- **XP**: 500  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT SUM(upvotes) FROM reviews WHERE user_id=$USER >= 100;`

## 13. `first_share_complete`
- **Name**: Viral Starter  
- **Purpose**: Share a derive that a friend completes.  
- **XP**: 75  
- **one_time**: true, **missable**: false  
- **Verify**: `Track shared_derive_id; verify another user completed it (derive_completed_by_friend=true).`

## 14. `referrer`
- **Name**: Referrer  
- **Purpose**: Refer a friend who completes onboarding.  
- **XP**: 500  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM referrals WHERE referrer_id=$USER AND referred_completed_onboarding=true;`

## 15. `creator_first_publish`
- **Name**: First Public Derive Published  
- **Purpose**: Publish your first public derive (Pro or approved).  
- **XP**: 200  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM derives WHERE user_id=$USER AND public=true;`

## 16. `long_walk`
- **Name**: Long Walker  
- **Purpose**: Complete a derive >= 120 minutes.  
- **XP**: 300  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*)>0 FROM derives WHERE user_id=$USER AND duration_minutes >= 120;`

## 17. `reviewer_trust`
- **Name**: Reviewer Trust  
- **Purpose**: Have 5 reviews verified/accepted by moderation (credibility).  
- **XP**: 150  
- **one_time**: true, **missable**: false  
- **Verify**: `SELECT COUNT(*) FROM reviews WHERE user_id=$USER AND status='verified' >= 5;`

Adjust totals as tuning proceeds. Keep list small and high-signal.

## Rules
- Award once per user. Provide audit log for revocations if abuse found.
- Missable achievements must be shown in UI with expiry and “why missable” copy.
- Achievements may grant entitlements (titles).

## UX
- Toast + orb pulse on unlock.
- Achievements display in passport with explanation and awarded date.

## Telemetry
- `event_achievement_unlocked {user_id, achievement_id, xp_awarded, source_event}`
