# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/` organized by feature: `components/`, `screens/`, `navigation/`, `api/`, `utils/`, `state/`, `services/`, `config/`, `constants/`.
- Native shells: `ios/`, `android/`; assets: `assets/`; documentation: `docs/` (see `docs/ArchetypeOrb_Plan.md`).
- Three/R3F code: `src/components/three/`; Supabase access: `src/api/` and `src/services/`.
- Mobile app native never to use web components

## Build, Test, and Development Commands
- `npm run start` — Start Expo (Dev Client).  
- `npm run ios` / `npm run android` — Run on simulator/device.  
- `npm run web` — Web preview (for debugging only; app is mobile-first).  
- `npm run lint` — Lint using Expo ESLint config.  
- `npm run reset-project` — Clean caches via `scripts/reset-project.js` (fixes Metro/Expo drift).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; strings: double quotes; trailing commas where allowed.
- Components/screens: PascalCase (`HomeScreen.tsx`), hooks/utils: camelCase, constants: SCREAMING_SNAKE_CASE.
- Use TypeScript for new modules when feasible; otherwise JSDoc complex JS.
- React Three on native: import `@react-three/fiber/native` and `@react-three/drei/native`. Keep a single `three` instance (avoid multiple versions). No web-only APIs.
- Modular, not over engineered, simplest solutions
- Senior dev though patterns

## Testing Guidelines
- Jest is not yet configured. If adding tests, place them alongside code with `.test.ts(x)` and mock Supabase calls.
- Manual checks for rendering changes: open Home → verify Archetype Orb animates and reflects Supabase profile data (top 3 archetypes). See `docs/ArchetypeOrb_Plan.md` for expected visuals/behavior.

## Commit & Pull Request Guidelines
- Commits: imperative, present tense, short scope-first subjects (e.g., `Fix orb render loop on iOS`).
- PRs must include: purpose, before/after screenshots (UI), steps to validate, linked issues, and any Supabase schema/doc changes.
- If touching orb code, reference `docs/ArchetypeOrb_Plan.md` and note device(s) tested.

## Security & Configuration
- Never commit secrets. Store keys in `.env` (see `README.md`); after changes run `npm run reset-project`.
- Supabase: use service functions in `src/api/`/`src/services/`—do not query inside components.
- Mobile only: avoid introducing web-specific code paths; prefer native-safe R3F/Drei primitives.
