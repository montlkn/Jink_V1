# Repository Guidelines

## Project Structure & Module Organization
App code lives in `src/`, grouped by feature (`navigation`, `screens`, `components`, `state`) so changes stay localized. API wrappers in `src/api` own all Supabase and HTTP calls; keep new network logic there. Shared styles and tokens sit under `src/config` and `src/constants`. Platform shells remain in `ios/` and `android/`, static media in `assets/`, and supporting docs in `docs/`. Utility scripts, including the cache reset helper, belong in `scripts/`.

## Build, Test, and Development Commands
Use `npm run start` for the Expo dev client and QR code workflow. Platform builds run via `npm run ios`, `npm run android`, and the browser preview with `npm run web`. When caches drift, execute `npm run reset-project` to call `scripts/reset-project.js` (clears Expo, Metro, and node_modules). Keep code quality in check with `npm run lint`, which applies Expo’s ESLint preset for React Native + TypeScript.

## Coding Style & Naming Conventions
Follow two-space indentation and double quotes, matching files like `src/navigation/AppNavigator.js`. Components and screens use PascalCase, hooks and utilities use camelCase, and constants reserve SCREAMING_SNAKE_CASE. Prefer TypeScript for new modules where practical (`auth/` already uses `.tsx`); otherwise annotate complex JS with JSDoc for editor support. Import paths should stay relative to the feature folder to avoid Metro resolution issues. Run linting before every push.

## Testing Guidelines
No automated suite exists yet; add Jest unit tests under `src/__tests__/` or alongside features using a `.test.ts` suffix. Mock Supabase interactions to keep tests offline and deterministic. For UI flows, document manual steps in PRs (e.g., “Start derive flow → finish onboarding → confirm BottomTabNavigator renders profile”). Design new modules with injectable dependencies to simplify future E2E coverage.

## Commit & Pull Request Guidelines
Git history shows short status messages; tighten them into imperative, present-tense subject lines (`Add onboarding poll`, `Fix derive timer`). Group related work per commit and mention issue IDs when relevant. PRs should include a concise summary, screenshots or recordings for UI changes, lint/test evidence, and links to Supabase schema updates if touched. Flag breaking changes in the title and request review from the platform owner before merge.

## Environment & Configuration
Keep secrets in `.env` as documented in the README; never commit them. When adding config keys, note them in `docs/` and the PR checklist. After editing environment values, run `npm run reset-project` so Expo reloads the updated configuration.
