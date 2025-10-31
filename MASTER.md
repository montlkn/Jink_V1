Navigation centralize, cleanup, and optimization
Scope: fix navigation bugs, consolidate navigation sources of truth, lazy-load screens, tighten types, add CI checks, and provide rollout/test steps.

---

## 1 — Executive summary

* Fix ambiguous deep links and make prefixes env-configurable. 
* Centralize navigation constants and types. 
* Make `Stack.tsx` minimal and lazy-load non-essential screens. This reduces app startup CPU and failure surface. 
* Improve `nav` helpers so TypeScript enforces params. 
* Add canonical `BottomTabNavigator` and use typed `MainTabParams`. 
* Add CI checks: `tsc --noEmit`, `eslint`, unit + smoke tests.
* Verify flows with a deterministic test plan: auth, deep links, tab navigation, walk flows, camera/scan.

Success criteria

* App builds without navigation-related TypeScript errors.
* Deep links resolve uniquely to intended screens.
* Cold start time reduced by lazy evaluation of screens.
* Navigation params are statically checked.

---

## 2 — Current snapshot (what I observed)

Files of interest:

* `src/navigation/Stack.tsx` — routes listed with many eager imports. Drives runtime load. 
* `src/navigation/nav.ts` — exports `navRef` and helpers but uses `any` casts. Tighten typing. 
* `src/navigation/routes.ts` — `screens` constants and `RootParams`. Good single place. Export `MainTabParams`. 
* `src/navigation/linking.ts` — duplicate paths for `WalkCamera` and `WalkStart`. Prefixes are placeholders. Fix collisions and make prefixes env-configurable. 
* `src/navigation/BottomTabNavigator.*` — missing in branch; `Stack.tsx` imports it. Add canonical implementation. 

Context: `App.js` only renders `RootNavigator`. Keep `App.js` unchanged; focus on navigation internals. 

---

## 3 — Design principles

1. **Single source of truth** for route names and params (`routes.ts`). 
2. **Minimal startup work.** Only import what is required at app initialization. Use `getComponent` for lazy screen evaluation.
3. **Type-safe navigation.** Use `RootParams`/`MainTabParams` and avoid `any`.
4. **Deterministic deep links.** Unique canonical path for every screen. Prefixes from env. 
5. **Small incremental PRs.** Each change is atomic and testable.
6. **CI-first.** Prevent regressions with `tsc` and lint checks.

---

## 4 — File structure proposal (navigation folder)

```
src/navigation/
├── BottomTabNavigator.tsx
├── Stack.tsx
├── RootNavigator.tsx
├── nav.ts
├── linking.ts
├── routes.ts
├── screenLoaders.ts        # lazy loaders / central place for getComponent
└── index.ts               # re-exports for convenience
```

Rationale: `screenLoaders.ts` centralizes all `require()` calls so tests and changes live in one file.

---

## 5 — Detailed tasks & patches (high-priority)

### 5.1 `linking.ts` — canonicalize and env-configure prefixes

Problems: duplicated keys (`WalkCamera`, `WalkStart`) and development placeholders.
Action:

* Remove duplicates.
* Use `process.env` to set `prefixes`.
* Keep canonical one-to-one mapping.

**Patch (full file)**

```ts
// src/navigation/linking.ts
import type { LinkingOptions } from "@react-navigation/native";
import { screens, type RootParams } from "./routes";

const prefixes = [
  process.env.EXPO_DEEP_LINKING_SCHEME ?? "myapp://",
  process.env.EXPO_PUBLIC_APP_URL ?? "https://myapp.example",
];

export const linking: LinkingOptions<RootParams> = {
  prefixes,
  config: {
    screens: {
      [screens.AuthLogin]: "auth/login",
      [screens.AuthCallback]: "auth/callback",
      [screens.OnboardingQuiz]: "onboarding/quiz",
      [screens.Main]: {
        path: "",
        screens: {
          [screens.Home]: "",
          [screens.WalkCamera]: "walk/camera",
          [screens.WalkStart]: "walk/start",
          [screens.Passport]: "passport",
        },
      },
      [screens.Quests]: "quests",
      [screens.WalkSummary]: "walks/:walkId",
      [screens.Profile]: "u/:userId",
      [screens.PassportListDetail]: "passport/list/:listId?",
      [screens.Search]: "search",
      [screens.Scan]: "scan",
      [screens.ScanCamera]: "scan/camera",
      [screens.ScanContribution]: "scan/contribute",
      [screens.WalkSetup]: "walk/setup",
      [screens.WalkNav]: "walk/nav",
      [screens.BuildingModule]: "walk/building",
      [screens.BuildingInfo]: "scan/building",
      [screens.NotFound]: "scan/not-found",
      [screens.PastWalksNolli]: "walks/past",
    },
  },
};
```

Why: Unique mapping avoids ambiguity. Prefixes from env let CI/production override values. See original linking for duplicates. 

---

### 5.2 `nav.ts` — tighten types and add small guard

Problem: uses `any` casts. Provide safer helper that logs when navigation attempted before ready.
Action: replace with typed helper.

**Patch**

```ts
// src/navigation/nav.ts
import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootParams } from "./routes";

export const navRef = createNavigationContainerRef<RootParams>();

export function navigate<Name extends keyof RootParams>(
  name: Name,
  params?: RootParams[Name]
) {
  if (navRef.isReady()) {
    // TS overload quirk: cast required to satisfy react-navigation signature.
    navRef.navigate(name as any, params as any);
  } else {
    console.warn("[nav] navigate() called before navRef is ready", name, params);
  }
}

export function goBack() {
  if (navRef.isReady() && navRef.canGoBack()) navRef.goBack();
}
```

Why: Typed `navRef` enforces `RootParams`. The guard highlights races. Original file used looser typing. 

---

### 5.3 `routes.ts` — export `MainTabParams` and verify `screens`

Action: export `MainTabParams` and ensure `screens` constants are keys used across code.

**Patch (small)**

```diff
-export type MainTabParams = {
+export type MainTabParams = {
  Home: undefined;
  WalkCameraScreen: undefined;
  WalkStartScreen: undefined;
  Passport: undefined;
};
```

Why: typed tabs let BottomTabNavigator use `createBottomTabNavigator<MainTabParams>()`. See original `routes.ts`. 

---

### 5.4 Add `BottomTabNavigator.tsx`

Problem: `Stack.tsx` imports `BottomTabNavigator` but file was missing.
Action: create a canonical, typed bottom-tab navigator that uses `screens` constants.

**Patch**

```tsx
// src/navigation/BottomTabNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { screens, type MainTabParams } from "./routes";

import HomeScreen from "@/screens/Home/HomeScreen";
import WalkCameraScreen from "@/screens/Walk/WalkCameraScreen";
import WalkStartScreen from "@/screens/Walk/WalkStartScreen";
import PassportScreen from "@/screens/Passport/PassportScreen";

const Tab = createBottomTabNavigator<MainTabParams>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="WalkCameraScreen" component={WalkCameraScreen} />
      <Tab.Screen name="WalkStartScreen" component={WalkStartScreen} />
      <Tab.Screen name="Passport" component={PassportScreen} />
    </Tab.Navigator>
  );
}
```

Why: satisfies `Stack.tsx` import. Use typed `MainTabParams`. `Stack.tsx` was expecting this component. 

---

### 5.5 `screenLoaders.ts` — centralize lazy requires

Action: add utility that returns `getComponent` functions to avoid repetitive code.

**Example**

```ts
// src/navigation/screenLoaders.ts
export const lazyScreen = (path: string) => () => require(path).default;

export const ScreenLoaders = {
  Home: lazyScreen("@/screens/Home/HomeScreen"),
  Quests: lazyScreen("@/screens/Quests/QuestsScreen"),
  WalkSummary: lazyScreen("@/screens/Walk/WalkSummaryScreen"),
  Profile: lazyScreen("@/screens/Profile/ProfileScreen"),
  Passport: lazyScreen("@/screens/Passport/PassportScreen"),
  PassportListDetail: lazyScreen("@/screens/Passport/ListDetailScreen"),
  Search: lazyScreen("@/screens/Search/SearchScreen"),
  Scan: lazyScreen("@/screens/Scan/ScanScreen"),
  ScanCamera: lazyScreen("@/screens/Scan/CameraScreen"),
  ScanContribution: lazyScreen("@/screens/Scan/ContributionScreen"),
  WalkStart: lazyScreen("@/screens/Walk/WalkStartScreen"),
  WalkNav: lazyScreen("@/screens/Walk/WalkNavScreen"),
  WalkCamera: lazyScreen("@/screens/Walk/WalkCameraScreen"),
  WalkSetup: lazyScreen("@/screens/Walk/WalkSetupScreen"),
  BuildingModule: lazyScreen("@/screens/Walk/BuildingModule"),
  BuildingInfo: lazyScreen("@/screens/Scan/BuildingInfoScreen"),
  NotFound: lazyScreen("@/screens/Scan/NotFoundScreen"),
  PastWalksNolli: lazyScreen("@/screens/PastWalks/PastWalksNolliScreen"),
  OnboardingQuiz: lazyScreen("@/screens/Quiz/OnboardingQuizScreen"),
};
```

Why: one place to maintain require paths. `require()` postpones evaluation until first navigation. Note: Metro bundles bytes together but calling `require()` postpones evaluation and work.

---

### 5.6 `Stack.tsx` — minimal, typed, lazy

Problem: `Stack.tsx` eagerly imports many screens. Solution: keep only essential static imports and lazy load the rest using `getComponent` + `screenLoaders.ts`.

**Suggested `Stack.tsx`**

```tsx
// src/navigation/Stack.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { screens, type RootParams } from "./routes";
import { navRef } from "./nav";
import { linking } from "./linking";

import BottomTabNavigator from "./BottomTabNavigator";
import AuthLoginScreen from "@/screens/Auth/LoginScreen";
import AuthCallbackScreen from "@/screens/Auth/AuthCallbackScreen";
import { useAuth } from "@/auth/authProvider";
import { ScreenLoaders } from "./screenLoaders";

const Stack = createNativeStackNavigator<RootParams>();

export function AppStack() {
  const { session, loading } = useAuth() as { session: unknown; loading: boolean };
  if (loading) return null;

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name={screens.AuthLogin} component={AuthLoginScreen} />
            <Stack.Screen name={screens.AuthCallback} component={AuthCallbackScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={screens.Main} component={BottomTabNavigator} />
            <Stack.Screen name={screens.Home} getComponent={ScreenLoaders.Home} />
            <Stack.Screen name={screens.Quests} getComponent={ScreenLoaders.Quests} />
            <Stack.Screen name={screens.WalkSummary} getComponent={ScreenLoaders.WalkSummary} />
            <Stack.Screen name={screens.Profile} getComponent={ScreenLoaders.Profile} />
            <Stack.Screen name={screens.Passport} getComponent={ScreenLoaders.Passport} />
            <Stack.Screen name={screens.PassportListDetail} getComponent={ScreenLoaders.PassportListDetail} />
            <Stack.Screen name={screens.Search} getComponent={ScreenLoaders.Search} />
            <Stack.Screen name={screens.Scan} getComponent={ScreenLoaders.Scan} />
            <Stack.Screen name={screens.ScanCamera} getComponent={ScreenLoaders.ScanCamera} />
            <Stack.Screen name={screens.ScanContribution} getComponent={ScreenLoaders.ScanContribution} />
            <Stack.Screen name={screens.WalkStart} getComponent={ScreenLoaders.WalkStart} />
            <Stack.Screen name={screens.WalkSetup} getComponent={ScreenLoaders.WalkSetup} />
            <Stack.Screen name={screens.WalkNav} getComponent={ScreenLoaders.WalkNav} />
            <Stack.Screen name={screens.WalkCamera} getComponent={ScreenLoaders.WalkCamera} />
            <Stack.Screen name={screens.BuildingModule} getComponent={ScreenLoaders.BuildingModule} />
            <Stack.Screen name={screens.BuildingInfo} getComponent={ScreenLoaders.BuildingInfo} />
            <Stack.Screen name={screens.NotFound} getComponent={ScreenLoaders.NotFound} />
            <Stack.Screen name={screens.PastWalksNolli} getComponent={ScreenLoaders.PastWalksNolli} />
            <Stack.Screen name={screens.OnboardingQuiz} getComponent={ScreenLoaders.OnboardingQuiz} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Why:

* Only `Auth` and `BottomTabNavigator` are static. All other screens evaluate when needed.
* Uses `screens` constants so names remain consistent.
  See original Stack listing to ensure we included all screens. 

---

## 6 — TypeScript & props

* Use `NativeStackScreenProps<RootParams, 'Home'>` where a screen needs typed navigation/route props.
* Keep `RootParams` and `MainTabParams` as the single source for types. 
* For inline wrappers used previously (e.g., `<Stack.Screen>{props => <X {...props} />}</Stack.Screen>`), replace with `getComponent` unless wrapper is doing extra work. If wrapper is necessary, export the wrapped component from its module so `getComponent` can return the final component.

---

## 7 — Linting & formatting

* Add or ensure `eslint` with `@react-native-community`/`plugin:react/recommended` and `plugin:@typescript-eslint/recommended`.
* Add `prettier` and `eslint-config-prettier`.
* Add `import/order` rule to keep imports tidy.

Suggested `.eslintrc.js` minimal:

```js
module.exports = {
  extends: ["@react-native-community", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
};
```

---

## 8 — Performance notes and caveats

* `require()` inside `getComponent` postpones evaluation. Metro still includes modules in the bundle. The optimization reduces startup CPU but not necessarily bytes downloaded. If you need on-demand code-splitting, consider RAM bundles or Hermes AOT and specialized bundler configuration.
* Keep heavy providers and initializations out of top-level screen modules. Do not perform large computations at module scope. `App.js` should only mount `RootNavigator`. 

---

## 9 — CI and tests

CI checks on PR:

1. `npm ci` / `yarn install`
2. `npx tsc --noEmit`
3. `eslint src --ext .ts,.tsx`
4. `jest --passWithNoTests` or unit tests
5. Optionally, `detox` or `e2e` smoke test job for navigation flows

Example GitHub Actions workflow snippet:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint src --ext .ts,.tsx
      - run: npm test
```

---

## 10 — Manual verification checklist

* [ ] `yarn tsc --noEmit` passes.
* [ ] App boots. Auth flow loads and returns session. `RootNavigator` shows `BottomTabNavigator` after auth. (See `RootNavigator` wraps providers.) 
* [ ] Deep links: `myapp://walk/start`, `https://myapp.example/walks/<id>`, `myapp://scan` all route to their screens. Use `expo` or shell to test. 
* [ ] Bottom tabs show Home/Start/Camera/Passport and each tab loads its screen.
* [ ] Navigate via `nav.navigate('WalkSummary', { walkId: '...' })` from anywhere. Watch types. 
* [ ] Try navigation before navRef ready. Expect console warning. (This highlights race conditions.)

---

## 11 — Migration & PR strategy

Break into small PRs:

1. **PR 1**: `linking.ts` fix + env keys.
2. **PR 2**: `nav.ts` typing change.
3. **PR 3**: add `BottomTabNavigator.tsx` and `MainTabParams` export from `routes.ts`.
4. **PR 4**: add `screenLoaders.ts`.
5. **PR 5**: update `Stack.tsx` to lazy-load using `getComponent`.
6. **PR 6**: add CI workflow and lint configs.
7. **PR 7**: address missing screen files or path fixes discovered during PR review.

Each PR:

* One logical change.
* Contains unit smoke test for the change where possible.
* Includes screenshots or recorded run for the navigation flow if it affects UI.

Branch naming:
`fix/navigation/<short-desc>` or `refactor/navigation/<short-desc>`

Commit messages:

* `navigation: canonicalize linking paths`
* `navigation: tighten nav helper typing`
* `navigation: add bottom tabs and typed MainTabParams`
* `navigation: lazy-load stack screens`

---

## 12 — Rollout & rollback

* Merge PRs progressively into `Refactor/navigation-centralize` branch.
* Run full test matrix (local device/emulator).
* If production release required, tag and run staged rollout. Monitor crashlytics for regressions.
* Rollback: revert individual PR commit(s) if new crash or breakage observed.

---

## 13 — Risks and mitigation

1. **Missing screens** — `Stack.tsx` referenced screens that may be moved. Mitigation: PR by PR, run `npx tsc` and `npx expo start` to detect missing paths. I flagged `BottomTabNavigator` missing earlier. 
2. **Broken deep links** — canonicalization might change existing deep-link URIs. Coordinate with QA and update marketing/docs.
3. **Type churn** — `getComponent` with `require()` loses some static typing for screen props. Mitigation: keep `RootParams` correct and document expected props.
4. **Bundle strategy** — `require()` reduces CPU at startup but not bytes. If you need network bytes saved or true on-demand code, plan bundler changes (RAM bundles or Hermes AOT).

---

## 14 — Remaining issues that are NOT fixed by these patches

The navigation changes fix the high-priority navigation problems but not every issue in the repo. These remaining issues must be verified and fixed separately:

* **Missing or mismatched screen files and exports.**
  `Stack.tsx` references many screens. Verify every path exists and exports a default component: `@/screens/Home/HomeScreen`, `@/screens/Quests/QuestsScreen`, `@/screens/Walk/WalkSummaryScreen`, `@/screens/Auth/LoginScreen`, `@/screens/Auth/AuthCallbackScreen`, `@/screens/Walk/WalkCameraScreen`, `@/screens/Walk/WalkStartScreen`, `@/screens/Passport/PassportScreen`, `@/screens/Passport/ListDetailScreen`, `@/screens/Scan/CameraScreen`, `@/screens/Scan/ContributionScreen`, etc. If any are missing the app will fail at navigation time. 

* **Name/constant mismatches between `screens`, `RootParams`, and tab names.**
  Use the `screens` constants for every navigator. The BottomTab keys must match the `MainTabParams` keys. If you keep string literals the app will compile but runtime lookups can fail. Double-check `routes.ts` vs BottomTab names. 

* **Auth flow and inline wrappers.**
  `Stack.tsx` used inline wrappers for some screens. If those wrappers did forwarding or side effects you must preserve that behavior when switching to `getComponent` or export a wrapped component instead. Test login → callback → main stack after changes. 

* **Deep-link runtime config and platform setup.**
  `linking.ts` now reads `EXPO_DEEP_LINKING_SCHEME` / `EXPO_PUBLIC_APP_URL`. You must set these env vars and update `app.json` / iOS/Android config (URL scheme/intent filters) so links work on device. Also confirm canonical paths in `linking.ts` match server/marketing links. 

* **TypeScript edge cases with `getComponent` and React-Navigation overloads.**
  `navRef.navigate` still needs a small `as any` cast because of RN types. `getComponent` + `require()` reduces static prop inference for screens. Keep `RootParams` accurate and use `NativeStackScreenProps` inside screens to regain typing. 

* **Screen lazy loaders mapping.**
  If you add `screenLoaders.ts` ensure every loader path exactly matches the file system and that the loader returns the correct component (default export). Otherwise `getComponent` will throw at runtime.

* **CI and static checks.**
  Add `npx tsc --noEmit` and `eslint` to CI. Run these locally now to find missing imports, type errors, and broken exports.

* **Performance caveat.**
  `require()` inside `getComponent` defers evaluation but Metro still bundles the files. If you need network bytes saved or true on-demand code, plan bundler changes (RAM bundles or Hermes AOT).

---

## 15 — Concrete verification steps (run locally)

1. `git checkout -b fix/navigation-centralize-check`
2. Apply the navigation patches I proposed (or have me apply them).
3. `npm ci` / `yarn`
4. `npx tsc --noEmit` — fix any type errors.
5. `npx eslint src --ext .ts,.tsx` — fix lint errors.
6. `npx expo start` then test these flows:

   * Auth login → callback → main tabs. (`RootNavigator` wraps providers.) 
   * Deep links: `myapp://walk/start`, `https://<domain>/walks/<id>`, `myapp://scan` (verify both dev and device). 
   * Open every bottom tab and navigate to several stack screens.
   * Try `nav.navigate('WalkSummary', { walkId: '...' })` and check types/logs. 
   * Try navigation before navRef ready and confirm the console warning.

---

## 16 — Immediate fixes I recommend before merging

1. Replace string literals with `screens` constants in `BottomTabNavigator`.
2. Convert inline wrappers in `Stack.tsx` to exported wrapped components or preserve wrappers in their own module so `getComponent` can return them.
3. Ensure env vars and `app.json` are set for deep links.
4. Run `tsc` and resolve the resulting errors.
5. Add basic navigation smoke tests to CI.

---

## 17 — Migration & PR strategy (restated)

Break into small PRs as described in §11. Merge progressively. Run CI on each PR. Keep changes small and testable.

---

## 18 — Rollback & monitoring (restated)

* Merge gradually. Stage releases. Monitor crashlytics. Revert offending PRs if needed.

---

## 19 — Next steps I can take for you

I can:

* apply the patches to the branch and run `npx tsc --noEmit` + `npx eslint` and report errors, or
* generate a single `git diff`/patch you can apply locally, or
* open PRs for each small change (linking, nav typing, bottom tabs, screen loaders, stack refactor).

Tell me which you want and I will prepare the patch / PR content.

---

## 20 — References

* `RootNavigator.tsx` — provider wrapper. 
* `Stack.tsx` — original stack file with many eager imports. 
* `nav.ts` — current nav helpers. 
* `routes.ts` — screen constants & RootParams. 
* `linking.ts` — original linking config with duplicates. 
* `App.js` — app entrypoint. 
* `README.md` — project context. 

---

End of `MASTER.md`.
