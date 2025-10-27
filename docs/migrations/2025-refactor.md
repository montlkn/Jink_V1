# 2025 Quest/XP Feature Refactor

## Summary
- Introduced the `quests` feature slice under `src/features/quests` with a dedicated facade (`QuestsFeature`) and data hook (`useQuestsData`).
- Moved quest/Xp read logic into `fetchActiveQuests` and `fetchXpSummary` inside `src/services/gateways/supabaseGateway.ts`.
- Added `completeQuest` gateway helper that resolves quest assignment, computes the remaining increment, and delegates to the `update_quest_progress` RPC.
- Updated legacy `questService` reads to call the new gateway helpers so existing consumers (`Home`, `Passport`, scan flows) stay functional.
- Tightened ESLint guards for `src/screens/**` to ban deep feature imports and direct `@/api/**` access.

## Operational notes
- `npx ts-prune`, `depcheck`, and `madge` require network access to install when not already vendored; rerun locally outside of the sandbox if dependency pruning is still outstanding.
- Expo lint (`npm run lint`) surfaces existing warnings/errors. Verify new code passes targeted lint runs (e.g. `npx eslint src/features/quests`).
- Expo native build commands (`npm run ios` / `npm run android`) were not executed in this environment.

## Follow ups
- Consider backfilling tests around `useQuestsData` once Jest is wired up.
- Review Home/Passport screens to see if they can consume the new feature hook directly once state management is consolidated.
