# Testing Implementation Plan (CI)

## Summary
Practical test layers and CI pipeline to keep the app shippable.

## Layers
- Unit: affinity math, XP calculations, stamp rules.
- Contract: edge function input/output schemas using JSON fixtures.
- Integration: camera → scan → XP → orb pulse using mocks for sensors and network.
- E2E: Detox flows for onboarding, scan, derive, passport.

## CI Steps
- Install deps, lint, typecheck.
- Run unit + contract.
- Spin a Supabase test instance via docker; run integration suite.
- Build release candidate for the chosen platform; run Detox sanity tests.

## Fixtures
- Provide golden vectors, sample building metadata, offline scan queue.

## Flake Strategy
- Retries x2 on E2E; quarantine failing tests with owner tags; track flake rate.
