# Implementation Readiness Checklist

## Mobile (Client)
- [ ] Camera pipeline calls /scan/identify with debounce
- [ ] Offline queue for scans, derives, contributions
- [ ] Orb FSM wired (idle→press→processing→resolve)
- [ ] XP store and transaction toasts
- [ ] Passport: stamps list, detail, memory composer
- [ ] Derive: setup, live step UI, summary sheet
- [ ] Search modal: autocomplete + results + handoff

## Backend (Edge/Supabase)
- [ ] RLS policies enforced (see auth_permissions.md)
- [ ] All endpoints from api_endpoints.md implemented
- [ ] Vector + FTS indexes created (search_indexing.md)
- [ ] Subscriptions webhooks wired; entitlements cached
- [ ] Event bus topics broadcast + consumed
- [ ] Analytics events emitted with privacy guard

## Tooling
- [ ] CI pipeline (testing_implementation.md)
- [ ] Sentry DSN + release tags
- [ ] Feature flags for exa.ai fallback and orb shaders

## Launch
- [ ] .env templates committed
- [ ] App store privacy answers drafted (privacy_data_policy.md)
- [ ] Crash-free session and scan-success KPIs monitored
