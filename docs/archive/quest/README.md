# Quest Feature Archive

This directory contains all quest-related code, documentation, and migrations that have been archived for v1 launch.

## Archive Date
February 16, 2026

## Reason for Archiving
The quest feature was deemed too convoluted and confusing for the initial v1 launch. It has been archived so it can be reimplemented at a later date with a simplified approach.

## Contents

### Source Code
- `src/archive/quest/` - All quest-related source files including:
  - `features/quests/` - Quest feature implementation
  - `components/quests/` - Quest UI components
  - `hooks/useQuestsData.ts` - Quest data hook
  - `utils/questTimers.ts` - Quest timing utilities
  - `screens/Quests/` - Quest screen
  - `services/gateways/questGateway.ts` - Quest gateway service
  - `types/Quest*.d.ts` - Quest TypeScript types

### Documentation
- `docs/archive/quest/QUEST_SYSTEM.md` - Quest system documentation
- `docs/archive/quest/Modifying-Quests.md` - Quest modification guide
- `docs/archive/quest/elements/quests.md` - Quest element documentation
- `docs/archive/quest/elements/quest_logic_demo.txt` - Quest logic demo

### Database Migrations
- `supabase/migrations/archive/quest/` - All quest-related SQL migrations

## Changes Made for v1

1. **Navigation**: Quest screen removed from navigation stack
2. **Feature Flags**: Quest feature disabled in `src/config/featureFlags.ts`
3. **XP System**: Quest progress tracking removed from XP gateway
4. **Screen Updates**: All quest imports and logic removed from:
   - `WalkStartScreen.js` - Now uses direct XP fetching
   - `ScanScreen.js` - Quest XP awarding replaced with direct `awardXp`
   - `BuildingInfoScreen.tsx` - Quest event recording removed
   - `NotFoundScreen.js` - Quest XP awarding replaced with direct `awardXp`

## Reimplementation Notes

When reimplementing quests:
1. Review the archived code for reference
2. Consider a simplified quest system focused on core engagement loops
3. Ensure quest logic doesn't complicate the XP/level system
4. Test quest assignment and completion flows thoroughly
5. Consider user feedback from v1 launch before rebuilding

## Related Features Still Active

- **XP System**: Still active and functional (quest progress tracking removed)
- **Level System**: Still active and functional
- **Streaks**: Still active and functional
- **Achievements**: Still active and functional
- **Stamps**: Still active (quest stamps remain in database but no new ones awarded)
