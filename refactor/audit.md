# Repo Slim-Down Audit — current branch

## What we ran
- Captured declared packages (`refactor/declared_deps.txt`), non-relative imports (`refactor/used_deps.txt`), diff (`refactor/potential_unused_deps.txt`), and raw import dump (`refactor/import_calls.txt`).
- `npx depcheck` findings saved to `refactor/depcheck.json`.
- `npx madge` outputs: dependency graph image (`refactor/import_graph.svg`), JSON graph (`refactor/madge.json`), circular report (`refactor/madge_circulars.txt`), and stdout with skipped modules (`refactor/madge_stdout.txt`). Ranked inbound-degree hotspots logged in `refactor/hotspots.txt`.
- Docs/service scans captured in `refactor/docs_mentions.txt`, `refactor/docs_service_refs.txt`, and `refactor/native_service_refs.txt`.
- Baseline installs/tests: `npm ci`, `npm test --silent` (`refactor/test_output.txt`), `npx tsc --noEmit` (`refactor/tsc_output.txt`).

## Key findings
- **Missing dependencies (blocking):** `expo-router`, `expo-file-system`, and `three-stdlib` are imported but absent from `package.json` (see `depcheck.json`). Madge also flags `expo-router` as unresolved.
- **High-risk modules:** `refactor/hotspots.txt` shows `src/api/supabaseClient.js` (10 inbound imports), `src/auth/authProvider.js` (6), `src/api/quizApi.js` (5), `src/constants/archetypeColors.js` (5), and `src/components/ArchetypeOrb.js` (4) as the most coupled entry points. These are prime strangler candidates.
- **Unused-dependency candidates:** `refactor/potential_unused_deps.txt` and `depcheck.json` overlap on items like `@react-native-community/blur`, `@react-navigation/elements`, `@react-navigation/stack`, `@react-three/drei`, `@shopify/react-native-skia`, `d3-shape`, several Expo surface modules, and `react-native-vision-camera`. Treat as suspects; many are likely safe to remove but confirm native/CLI usage first. Core tooling (`@babel/core`, `typescript`, `expo`, `react-native-reanimated`, `react-native-screens`, etc.) appear in the list due to lack of direct imports yet are required by Metro/React Navigation—document before pruning.
- **Alias gaps:** Imports using the `@/` alias are unresolved by Madge and `used_deps` detection. Configure madge/tsconfig path aliases or replace with explicit package entry points during the strangler migration.
- **Docs still reference removed services:** `docs_mentions.txt` highlights numerous docs referencing `bullmq`, `redis`, `modal`, etc. These should either move to `docs/archived/` or be updated to match the current runtime surface.

## Graph & coupling notes
- `npx madge --circular` reported no circular dependencies, but 9 modules were skipped (see bottom of `refactor/madge_stdout.txt`) due to unresolved aliases or missing packages.
- Dependency graph image at `refactor/import_graph.svg` provides the current module map for planning package boundaries.

## Test/toolchain status
- `npm test --silent` produced no output; Jest appears unconfigured or has zero suites. Add smoke tests as packages are carved out.
- `npx tsc --noEmit` failed with extensive errors (see `refactor/tsc_output.txt`): missing browser globals in `App.js`/`index.js`, missing asset typings, absent type definitions for Jest, invalid numeric math on string ranges, and Deno-specific Supabase edge function code. Addressing these is prerequisite for enforcing TS in CI.
- Prior Python-focused audit artifacts (`deps_tree.txt`, `vulture_dead.txt`, etc.) remain in `refactor/` for reference but are not relevant to the JS refactor.

## Recommended next steps
1. Add the missing runtime deps (`expo-router`, `expo-file-system`, `three-stdlib`) and re-run `npm install && npx madge` to clear unresolved warnings.
2. Review `potential_unused_deps.txt` / `depcheck.json` and classify each dependency (keep, archive with native notes, or remove). Prioritize `@react-three/drei`, `@shopify/react-native-skia`, `react-native-vision-camera`, and `expo-*` packages that are neither imported nor referenced in native configs.
3. Define package boundaries starting with the top hotspots: extract a `supabase` service package, an orb module, and a profiles/aesthetics domain package.
4. Archive or refresh docs referencing modal/redis/bullmq so that documentation matches the slimmed runtime surface.
5. Stabilize TypeScript tooling (fix missing types, add Jest typings, exclude web-only files if necessary) before adding lint/type checks to CI.
