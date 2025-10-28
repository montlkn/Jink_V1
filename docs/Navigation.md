# Navigation Overview

## Route Map

All routes are declared in a single source at `src/navigation/routes.ts`.  The
`screens` constant owns every route key while `RootParams` provides strongly
typed params for each entry.  Tabs are defined through
`NavigatorScreenParams<MainTabParams>` so nested screens stay in sync with the
stack.

## Linking

Deep-link configuration lives in `src/navigation/linking.ts`.  The map covers
auth flows, tabs, and every modal/push screen (building info, walk flows,
passport, etc.).  Updating a route requires adding its path here as well as in
`routes.ts`.

## ProtectedRoute

`src/navigation/ProtectedRoute.tsx` wraps screens that require an authenticated
session.  The wrapper defers rendering until the auth state is ready and will
redirect to the login screen if no session is available.

## Navigating

- Use `screens.<Name>` when calling `navigation.navigate` or the global helpers
  from `src/navigation/nav.ts`.
- Avoid raw strings—ESLint guards the screen layer against literal route names.
- For programmatic navigation outside components, pull in `navigate`/
  `goBack` from `nav.ts`.
