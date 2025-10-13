import os

BASE = "/Users/lucienmount/Arch_App_V2/architecture-app/docs/docs2"

def write(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)

DOCS = {
# ---------- SECURITY / RISK ----------
"security/threat_model.md": """# Threat Model (v1)

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
""",

"backend/rate_limits.md": """# Rate Limits (v1)

## Policy
- Identify users by auth uid and coarse IP hash.
- Return 429 with Retry-After; never hard drop.

## Limits
| Endpoint | Free | Pro | Window |
|----------|------|-----|--------|
| /scan/identify | 30/min | 60/min | 60s |
| /search/buildings | 60/min | 120/min | 60s |
| /quests/generate | 10/day | 30/day | 24h |
| /contributions/submit | 3/hour | 6/hour | 60m |

## Implementation
- Edge middleware counter (Redis or Postgres advisory locks)
- Token bucket with leaky refill; attach headers: X-RateLimit-*
""",

"backend/cost_controls.md": """# Cost Controls (AI + Vector + Egress)

## AI
- Exa/LLM calls gated behind feature flags; batched for nightly enrichment.
- Per-user monthly ceiling, per-session ceiling; degrade to cached summaries.

## Vector
- Batch re-embeds at off-peak; ivfflat lists=100; cap k=20 on searches.

## Maps/Tile Egress
- Tile cache (512 squarish) with 7d TTL; limit high-zoom fetching.

## Alerts
- Budgets per service; Slack alert at 70/90/100%.
""",

# ---------- DATA DEFINITIONS / ENV ----------
"backend/data_dictionary.md": """# Data Dictionary (compact v1)

## profiles
- user_id (uuid, pk)
- archetype_vector (jsonb[9 floats])
- total_xp (int)
- level (int)
- confidence (float 0..1)
- plan (text: Free|Pro)
- updated_at (timestamptz)

## scans
- id (uuid, pk)
- user_id (uuid)
- building_id (int)
- confidence (float)
- gps (geog point)
- heading (float deg)
- created_at (timestamptz)

## buildings
- id (int, pk)
- name (text)
- coords (geog point)
- style_vector (vector(512) + jsonb[9])
- metadata (jsonb)
- model_id (text)
- updated_at (timestamptz)

## xp_transactions
- id (uuid)
- user_id (uuid)
- amount (int)
- reason (text)
- source_id (uuid|int|null)
- created_at (timestamptz)

## passport_entries
- id (uuid)
- user_id (uuid)
- building_id (int)
- acquired_at (timestamptz)
- source (text: scan|derive|quest)

## contributions
- id (uuid)
- user_id (uuid)
- building_id (int)
- text (text)
- media_urls (text[])
- sources (text[])
- credibility (float)
- status (text: submitted|verified|rejected)
- created_at (timestamptz)
""",

"backend/env_config.md": """# Environment & Config

## Files
- .env.development – local dev
- .env.preview – staging
- .env.production – prod

## Keys
- SUPABASE_URL, SUPABASE_ANON_KEY (client)
- SUPABASE_SERVICE_ROLE (edge only)
- EXA_API_KEY (edge)
- MAPS_TOKEN (client ok)
- SENTRY_DSN (client + edge)

## Flags
- FEATURE_SEMANTIC_SEARCH
- FEATURE_ORB_SHADER_HEAVY
- FEATURE_PRO_MULTIPLIERS
- PROVIDER_EMBEDDINGS = clip|open-clip|local
""",

"backend/seeding_content_pipeline.md": """# Seeding & Content Pipeline

## Input
- CSV: buildings (id,name,lat,lng,year,style tags)
- Assets: stamps (SVG/PNG), copy blocks
- Curator notes

## Steps
1) Validate CSV schema
2) Geocode sanity check and dedupe
3) Embed images → vector column
4) Generate short summaries (batch)
5) Stamp art mapping table
6) QA list; push to staging; spot-check derives
7) Promote to prod with version tag

## Rollback
Keep last 2 seeds; revert by version id.
""",

# ---------- OPS ----------
"ops/release_process.md": """# Release Process

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
""",

"ops/rollback_plan.md": """# Rollback Plan

## Triggers
- Crash-free sessions < 98.5%
- Scan p95 > 1.5s for 30m
- RLS misconfig impacts write paths

## Steps
1) Flip feature flags off (heavy shaders, semantic search)
2) Revert to previous app build on stores (phased)
3) Database rollback of last migration (if schema change)
4) Announce in-app banner if user-visible

## Postmortem
48h blameless write-up; action items with owners and due dates.
""",

"ops/observability.md": """# Observability (Logs, Metrics, Traces)

## Client
- Sentry: crashes, breadcrumbs, release tags
- Custom: scan timings, derive timings, GPU fallback events

## Edge
- Structured logs (json): request_id, endpoint, latency_ms, err
- Metrics: p50/p95 latency, RPS, error rate
- Traces: scan pipeline spans: prefilter → clip → write

## Dashboards
- Red routes: scan, derive, search
- Error budget burn-down per endpoint
""",

"ops/slo_error_budgets.md": """# SLOs & Error Budgets

## SLOs
- Scan success ≥ 95%
- Scan p95 ≤ 900 ms
- Derive p95 ≤ 1.2 s
- Crash-free sessions ≥ 99.2%

## Budgets
- Monthly 2.5% error budget per SLO
- Freeze risky deploys when burn rate > 2x

## Reviews
- Weekly SLO check-in; rollback or invest based on burn
""",

"ops/feature_flags_ab_testing.md": """# Feature Flags & A/B Testing

## Flags
- Boolean gates for risky modules; stickiness by user_id
- Remote config via signed JSON endpoint

## Experiments
- Small, time-bounded, pre-registered hypothesis
- Metrics: TTFC, scan_success, session length, DAU retention proxy
""",

# ---------- FRONTEND UX SUPPORT ----------
"frontend/i18n.md": """# Internationalization (i18n) & Locale

## Strategy
- One code path; string keys only; no concatenated sentences.

## Files
- /i18n/en.json initial; later add fr/es/ja

## Dates/Numbers
- Use Intl APIs; 24h clocks by locale; metric/imperial toggles.

## RTL
- Audit all screens for RTL mirroring; avoid directional icons hard-coded.
""",

# ---------- PRODUCT / LEGAL ----------
"product/content_policy.md": """# User Content Policy (Draft)

## Allowed
- Building photos, style notes, historical facts with sources.

## Disallowed
- Faces/license plates (blur or abstain), private residences interior shots, hate/harassment, spam.

## Moderation
- Auto-filters: profanity list; image detection for faces/plates if feasible
- Peer verification; staff override
- Escalation SLA < 48h
""",

"product/app_store_checklist.md": """# App Store Submission Checklist

## Privacy & Permissions
- Camera usage description: “Identify buildings and create stamps”
- Location usage: “Improve recognition and derive routes”
- Data collection summary matches privacy_data_policy.md

## Assets
- Screenshots: Home, Camera (orb), Result, Derive, Passport
- App icon & splash with brand consistency

## Accounts
- Test account: Free
- Test account: Pro with sample entitlements

## Review Notes
- Explain offline mode behavior and limited functionality
""",

"legal/licenses_attribution.md": """# Licenses & Attribution

## Third-party
- CLIP model license summary
- Map tiles provider attribution rules
- Fonts and icon sets licenses
- Datasets (if any) and their terms

## Notices
- Include at Settings → About → Licenses
""",
}

if __name__ == "__main__":
    for rel, txt in DOCS.items():
        write(rel, txt)
    print(f"✅ Wrote {len(DOCS)} final gap-filling docs into {BASE}")
