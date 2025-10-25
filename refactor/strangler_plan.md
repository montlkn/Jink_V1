# Strangler rollout targets

## Top inbound-degree modules (madge)
1. `src/api/supabaseClient.js` — 10 references
2. `src/auth/authProvider.js` — 6 references
3. `src/api/quizApi.js` — 5 references
4. `src/constants/archetypeColors.js` — 5 references
5. `src/components/ArchetypeOrb.js` — 4 references
6. `src/state/orbTransitionContext.js` — 4 references
7. `src/utils/archetypeColorBlend.js` — 3 references
8. `src/services/questService.js` — 3 references
9. `src/components/walk/TimeSlider.js` — 3 references
10. `src/utils/questTimers.js` — 2 references
11. `src/components/common/PillButton.js` — 2 references
12. `src/api/summaryApi.js` — 2 references
13. `src/services/aestheticScoringService.js` — 2 references
14. `src/services/walkHistoryService.ts` — 2 references

## Proposed package wave
1. **core-foundation**: constants, typography, colors, and reusable helpers (`src/constants/*`, `src/utils/*` except feature-specific). Establish public exports and add type coverage.
2. **supabase-services**: migrate `src/api/supabaseClient.js`, `src/auth/authProvider.js`, `src/auth/profileSync.js`, Supabase API wrappers, and quest services into `packages/services-supabase`.
3. **orb-ui**: wrap `src/components/ArchetypeOrb.js`, `src/components/three/*`, and supporting state (`src/state/orbTransitionContext.js`, `src/utils/archetypeColorBlend.js`) into `packages/ui-orb`.
4. **walk-flow**: extract walk-specific modules (`src/components/walk/*`, `src/screens/Walk/*`, `src/services/walkHistoryService.ts`, `src/services/questService.js`) into `packages/feature-walk` with a compact navigation API.
5. **profile-passport**: migrate profile/passport screens and services into `packages/feature-passport`, reusing the core/orb exports above.

Each wave should:
- Add package skeleton with barrel exports and README.
- Copy existing implementation, add unit/integration tests, then codemod imports to consume the new package API.
- Run `npm test`, `npm run lint`, `npm run typecheck`, and `npx madge --circular` before merging.

## Core-foundation next actions
- [ ] Mirror `src/constants/colors.ts`, `src/constants/typography.ts`, and `src/config/colors.js` into `packages/core-foundation/src`.
- [ ] Promote shared formatters (`src/utils/normalize.js`, `src/utils/questTimers.js`) and convert to TypeScript where needed.
- [ ] Use `refactor/codemods/replace-core-foundation-imports.js` to rewrite imports, then fix any alias edge cases manually.
- [ ] Add focused unit tests under `packages/core-foundation/src/__tests__/` for exported helpers.
- [ ] Update documentation to reference `@jink/core-foundation` for shared utilities.
