# Release Process

## Branching
- main protected, release/* branches, hotfix/* for critical regressions.

## Train
- Weekly release train; feature flags for risky modules.

## Build
- Bump version; tag; build artifacts; store in releases/
- Generate changelog from PR titles

## Approvals
- Design and QA sign-off gates

## Post-Release
- Monitor KPIs for 24h; fast rollback if p95 scan latency > 1.5s or crash-free < 98.5%
