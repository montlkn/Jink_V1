# Threat Model (v1)

## Scope
Mobile client, edge functions, Supabase (RLS), vector store, 3P AI services.

## Assets
- PII-lite: email, coarse location buckets, user-generated memories.
- Sensitive-ish: raw photos (if user opts in), contribution text before moderation.
- Secrets: API keys (edge only), service-role keys (never on client).

## Actors
- Honest but curious user
- Over-eager scraper
- Malicious spammer
- Compromised device

## Risks & Mitigations
| Risk | Vector | Mitigation |
|------|--------|------------|
| API scraping | unauth GET search | rate limits per IP+user, cache, require auth for heavy endpoints |
| Location leakage | raw lat/lng in analytics | tile buckets; never log raw lat/lng |
| Spam contributions | scripted posts | per-user rate limit, similarity checks, quarantine low-cred |
| Token theft | jailbroken device | short token TTL, refresh flow, device-bound salts |
| Key exfiltration | client bundle | no secrets in app, edge-only keys, rotate quarterly |

## RLS Must-haves
Self-only reads for scans/xp/entries; public buildings read-only; contributions read if verified or own.

## Incident Flow
Detect → Triage (severity) → Contain (revoke keys, disable endpoints) → Postmortem (blameless, 48h).
