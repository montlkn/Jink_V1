# 2025 Quest/XP Feature Refactor

## Summary
- Introduced the `quests` feature slice under `src/features/quests` with a dedicated facade (`QuestsFeature`) and data hook (`useQuestsData`).
- Routed quest/XP reads through `fetchActiveQuests`, `fetchXpSummary`, and `fetchXpSnapshot` inside `src/services/gateways/supabaseGateway.ts`.
- Removed the legacy `questService` module; all quest/XP consumers now call the gateway helpers.
- Consolidated quiz/profile summary APIs behind `src/services/gateways/quizGateway.ts` and `summaryGateway.ts`, removing the old `src/api/**` modules.
- Added `completeQuest` gateway helper that resolves quest assignment, computes the remaining increment, and delegates to the `update_quest_progress` RPC.
- Updated Home, Quests, Passport, and auth flows to depend on gateway exports (auth session/change listeners, sign-in/out helpers).
- Tightened ESLint guards for `src/screens/**` to ban deep feature imports and direct `@/api/**` access.

## Operational notes
- `npx ts-prune`, `depcheck`, and `madge` require network access to install when not already vendored; rerun locally outside of the sandbox if dependency pruning is still outstanding.
- Expo lint (`npm run lint`) surfaces existing warnings/errors. Verify new code passes targeted lint runs (e.g. `npx eslint src/features/quests`).
- Expo native build commands (`npm run ios` / `npm run android`) were not executed in this environment.

## Follow ups
- Consider backfilling tests around `useQuestsData` once Jest is wired up.
- Review Home/Passport screens to see if they can consume the new feature hook directly once state management is consolidated.
