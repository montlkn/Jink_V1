# Modifying Quests

## Feature structure
- Quests UI logic now lives in `src/features/quests`. Screens render the facade from `src/screens/Quests/QuestsScreen.tsx` so the screen layer only deals with presentation.
- Read operations are handled through `useQuestsData`. The hook resolves the active user from Supabase auth, calls the gateway fetchers, and returns a `{ status, value, refresh }` object. Prefer composing new selectors on the feature side instead of fetching inside screens.
- Mutations are exposed via `questsActions` (`src/features/quests/mutations.ts`). The facade delegates to gateway helpers so side effects remain centralized.

### Key files
- `index.ts` – re-exports the facade, hook, selectors, and actions.
- `questsView.tsx` – simple native UI wrapper that consumes the hook and actions.
- `useQuestsData.ts` – consolidates loading logic, resolves the authenticated user, and maps gateway responses into a feature view model.
- `selectors.ts` – mapping helpers for quest rows and XP snapshots. Extend these when adding new fields that should flow into the UI.
- `mutations.ts` – thin wrappers over gateway writes; keeps screens/components unaware of Supabase APIs.

## Gateway contract
- Supabase access is abstracted in `src/services/gateways/supabaseGateway.ts`.
- Reads:
  - `fetchActiveQuests(userId)` assigns missing daily/weekly quests and returns quest rows annotated with progress/completion state.
  - `fetchXpSummary(userId)` reads XP/level/spend data and normalises numbers.
- Writes:
  - `completeQuest({ userId, questId, now })` ensures the user is assigned to the quest, calculates the necessary increment, and defers to the `update_quest_progress` RPC. The return payload includes quest type and the completion timestamp.
- Gateway helpers are re-exported via `src/services/gateways/index.ts` so downstream modules should never import `@/api/supabaseClient` directly.

## When adding new behaviour
1. **Extend selectors first** – add any new fields coming back from Supabase to `selectors.ts` so the mapping stays in one place.
2. **Update the hook** – compose additional requests or derived state inside `useQuestsData`. Prefer returning richer view models instead of leaking raw data to screens.
3. **Expose mutations** – wrap new Supabase RPCs in `mutations.ts` and add a corresponding gateway helper. Screens should only invoke `questsActions`.
4. **Document** – update this file and log the change in `docs/migrations` when you move contracts or introduce new Supabase dependencies.

## Testing notes
- Run `npm run lint` (Expo wrapper around ESLint). Some legacy warnings exist; verify new code does not add regressions.
- Manual verification: open the Quests screen, confirm level + XP are hydrated, and exercise the complete button. Observe the XP badge on Home to ensure values stay in sync.
- If Supabase schema changes are required, coordinate updates in `docs/SUPABASE_XP_SCHEMA.sql` and note them in the migration log below.
