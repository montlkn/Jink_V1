import os

BASE = "/Users/lucienmount/Arch_App_V2/architecture-app/docs/docs2"

# ---------- helpers ----------
def ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def write_new(rel_path: str, content: str):
    path = os.path.join(BASE, rel_path)
    ensure_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def append_section(rel_path: str, content: str):
    path = os.path.join(BASE, rel_path)
    ensure_dir(path)
    mode = "a" if os.path.exists(path) else "w"
    with open(path, mode, encoding="utf-8") as f:
        f.write("\n\n" + content)

# ---------- new, missing docs (full files) ----------
NEW_DOCS = {
"backend/api_endpoints.md": """# Backend API Endpoints (v1)

## Summary
Canonical contract for mobile↔edge↔db. Request/response envelopes are stable; add fields with backwards-compatible defaults.

## Endpoints
### POST /scan/identify
- Body: { image_base64, gps:{lat,lng,hdop}, heading, pitch }
- Returns: { building_id, confidence, style_vector[9], xp_delta, profile_delta, stamp_issued:bool }
- SLAs: p95 ≤ 900 ms

### POST /xp/update
- Body: { user_id, amount, reason, source_id? }
- Returns: { total_xp, level, orb_pulse:{scale,hue,energy} }

### POST /route/derive
- Body: { user_id, start_geo, duration_minutes, mode: "personal"|"random" }
- Returns: { stops:[{building_id,eta_m}], route_polyline, rationale }

### POST /quests/generate
- Body: { user_id }
- Returns: { quests:[{id,name,type,reward,expires_at}] }

### POST /contributions/submit
- Body: { building_id, text, media_urls?, sources?[] }
- Returns: { contribution_id, credibility_init, xp_delta }

### POST /contributions/verify
- Body: { contribution_id, vote:+1|-1 }
- Returns: { credibility, status }

### GET /entitlements/refresh
- Returns: { plan:"Free"|"Pro", entitlements:{...}, credits:{deep_dive:int} }

### GET /search/buildings
- Query: q, lat?, lng?, limit?
- Returns: { results:[{building_id, reason, score, distance_m?}] }

### GET /search/autocomplete
- Query: q
- Returns: { suggestions:[{text, type}] }

## Errors
- { error_code, message, hint? }  See error_states.md for UI.
""",

"meta/implementation_checklist.md": """# Implementation Readiness Checklist

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
""",

"meta/performance_budgets.md": """# Performance Budgets

## App
- Cold start: ≤ 2.5s (dev), ≤ 1.5s (release)
- First interactive: ≤ 1.2s after splash
- Memory steady-state: ≤ 300 MB typical

## Camera/Scan
- Preview FPS: ≥ 28 on mid devices
- Scan p95: ≤ 900 ms, timeout 2.5s with graceful UI
- GC spikes: < 8 ms during capture

## Map/Derive
- Map interaction latency: < 16 ms
- Route generation p95: ≤ 1.2s

## Rendering
- One live shader scene at a time
- Avoid more than 2 concurrent animated props per node
""",

"meta/privacy_data_policy.md": """# Privacy & Data Policy (Product Spec)

## Principles
- Collect the least; protect the most.
- User control: export + delete.
- Anonymize location aggressively.

## Data Handling
- GPS rounding to 3-decimal degrees for analytics (≈110m)
- No raw images stored by default; keep only fingerprint/embedding unless user opts into library
- Contributions are public after verification; redact PII

## Rights
- Export: email link with JSON/CSV bundles
- Delete: 7-day grace, then full purge (soft delete window for undo)

## Retention
- XP ledger: indefinitely (pseudonymized)
- Analytics events: 12 months rolling
- Crash logs: 30 days
""",

"frontend/accessibility.md": """# Accessibility Guidelines

## Touch
- Targets ≥ 44×44 dp
- Gestures supplemented with buttons
- Haptics optional; respect device disabled state

## Text & Contrast
- Dynamic type supported on all content
- Min contrast 4.5:1 for interactive text

## VoiceOver
- Orb states have spoken labels: “Ready,” “Scanning,” “Matched: {name},” “Try again”
- Focus order: content-first, chrome second

## Motion Sensitivity
- Reduce motion flag collapses transitions to fades; disables parallax
""",

"frontend/ar_overlay_confirm.md": """# AR Overlay Confirmation

## Summary
When user reaches a stop, show a subtle AR frame that snaps when the correct facade aligns.

## Behavior
- Edge detection + horizon check; tolerance ±8°
- When match plausible, outline highlights and capture prompt shows
- If mismatch persists: show “Step back 2m” hint with arrow

## Performance
- Run at 15 Hz; throttle to 8 Hz on low battery
- Disable on older devices; fall back to 2D overlay
""",

"backend/ai_prompts_enrichment.md": """# AI Enrichment Prompts (exa + LLM)

## Building Card Enrichment
- Input: name, year, architect, style, 2–3 facts, city district
- Prompt goals: 3-sentence summary, one quirky detail, one cross-link
- Guardrails: no speculation; cite if confidence < 0.6

## Deep Dive Report (Pro)
- Sections: Origins, Materials, Context, Anecdotes, Nearby Related
- Style: calm, precise, concrete examples
- Length: 300–500 words, bulleted where helpful

## Safety
- Never fabricate dates; prefer “unknown”
- Strip PII from contributions before summarizing
""",

"backend/search_eval.md": """# Search Relevance Evaluation Plan

## Metrics
- NDCG@5, Recall@10 on a labeled set of 300 queries
- Click-through rate on top suggestion
- Time-to-first-correct (TTFC)

## Offline Set
- 200 direct-name queries (exact + fuzzy)
- 100 descriptive queries (e.g., “brick art deco corner tower”)

## Experiment Toggles
- fts_weight_name, fts_weight_alt, vec_weight, distance_decay
- exa_backfill_threshold

## Procedure
- Nightly job: run fixed query set; log metrics
- Weekly auto-report; flag regressions > 5%
""",
}

# ---------- expansions: append addendums to existing docs ----------
ADDENDUMS = {
"frontend/orb_camera_ui.md": """## Implementation Addendum v1.1 (Oct 2025)

### Finite State Machine
| State | Enter From | Exit To | Guard | Side Effects |
|------|------------|---------|-------|--------------|
| ORB_IDLE | — | ORB_PRESS | onPress | startBreath() |
| ORB_PRESS | ORB_IDLE | ORB_PROCESSING | onRelease | capture(), hapticTap() |
| ORB_PROCESSING | ORB_PRESS | ORB_SUCCESS/ORB_FAIL | scanDone | swirl(), setPulse(rate) |
| ORB_SUCCESS | ORB_PROCESSING | ORB_IDLE | after 300ms | ripple(), setHue(target) |
| ORB_FAIL | ORB_PROCESSING | ORB_IDLE | after 240ms | shakeSmall(), showRetry() |

### Gesture Tolerances
- Debounce: 350 ms after capture
- Move threshold: 12 dp before cancel
- Multi-touch cancels capture

### Accessibility
- Long-press alternative menu: “Scan,” “Import,” “Help”
- VoiceOver reads scan confidence as “Likely, Possible, Uncertain”

### Telemetry (per scan)
- { t_start, p95_estimate, device_perf_bucket, shader_fallback:bool }
""",

"systems/aesthetic_profile/affinity_engine.md": """## Implementation Addendum v1.1 (Oct 2025)

### Explicit Math
Let V_raw ∈ R^9, V_norm = softmax(V_raw/τ).
Given action a with normalized style S, learning rate α:
1) d = α · S
2) d' = d + A·d − O·d    where A is affinity matrix (sym), O is opposition matrix (diag or sparse)
3) V_raw = (1−β)·V_raw + β·(V_raw + d')
4) V_norm = softmax(V_raw/τ), τ = clamp(1−c·0.2, 0.8, 1.2)

### Surprise
If V_norm[i] < τ_u and S[i] > 0: V_raw[i] += ε, ε=0.02 decays with weekly diversity.

### Pseudocode
update(V_raw, S, a, ctx):
    α = base_alpha * w_action[a] * w_ctx(ctx)
    d = α * normalize(S)
    d_coupled = d + A@d - O@d
    β = clamp(α*0.6, 0.05, 0.35)
    V_raw = (1-β)*V_raw + β*(V_raw + d_coupled)
    apply_surprise(V_raw, V_norm, S)
    V_norm = softmax(V_raw/τ(c))
    c = update_confidence(c, S, V_norm)
    return V_raw, V_norm, c

### Versioning
- Store model_id and params hash per update for reproducibility.
""",

"systems/contribution_logic.md": """## Implementation Addendum v1.1 (Oct 2025)

### Roles
- Contributor, Peer, Verifier (staff/curator)
- Verifier actions service-role only

### Anti-spam
- Rate limit: 3 submissions/hour/user
- Similarity check (Levenshtein) against recent submissions
- Auto-quarantine low-cred accounts with bursty posts

### State Machine
draft → submitted → under_review → verified | rejected
SLA: first review < 24h; auto-nudge peers at 12h.

### Exposure
- Unverified shows as “Community Note” collapsed by default.
""",

"backend/auth_permissions.md": """## RLS Policy Examples (SQL Sketch)

-- profiles: self-read/write subset
create policy sel_profiles_self on profiles for select
  using (user_id = auth.uid());

create policy upd_profiles_self on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- scans: insert by owner, read own
create policy ins_scans_self on scans for insert
  with check (user_id = auth.uid());

create policy sel_scans_self on scans for select
  using (user_id = auth.uid());
""",

"backend/subscriptions.md": """## Webhooks & Entitlements Addendum

### Webhooks
- /webhooks/stripe
  - events: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
  - action: upsert subscriptions row, recompute entitlements

### Entitlement Map (Pro)
- deep_dive_credits: +1 / 1000 XP
- xp_multipliers: { scan:1.2, derive:1.25, quest:1.3, contrib:1.4 }
- create_public_quests: true
- orb_modulation: true
""",

"backend/search_indexing.md": """## DDL & Rebuild

### FTS
CREATE INDEX idx_buildings_fts ON buildings
USING GIN (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(alt_names,'') || ' ' || coalesce(neighborhood,'')));

### Vectors
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS emb vector(512);
CREATE INDEX IF NOT EXISTS idx_buildings_emb ON buildings USING ivfflat (emb vector_cosine_ops) WITH (lists = 100);

### Rebuild Procedure
1) Backfill emb for new/updated rows
2) ANALYZE buildings
3) Verify recall with nightly search_eval
""",

"backend/analytics_events.md": """## Event Catalog v1.1

### scan_success
- payload: { building_id, confidence, hdop, latency_ms, source:"camera"|"gallery" }

### xp_gain
- payload: { amount, reason, source_id?, total_xp }

### derive_finish
- payload: { stops:int, duration_m, route_len_km }

### privacy_guard
- coarse_geo tile id, no raw lat/lng
- user_id hashed with stable salt
""",

"frontend/error_states.md": """## State Mappings v1.1

| error_code | Banner | Primary Action | Secondary |
|------------|--------|----------------|-----------|
| CAMERA_PERMISSION_DENIED | Camera access needed | Open Settings | Demo Mode |
| LOCATION_PERMISSION_DENIED | Location helps recognition | Enable | Proceed anyway |
| SCAN_CONFIDENCE_LOW | Not sure yet | Pick from matches | Retry |
| NETWORK_OFFLINE | You’re offline | Save for later | Learn more |
""",
}

# ---------- run ----------
def main():
    # new docs
    for rel, txt in NEW_DOCS.items():
        write_new(rel, txt)
    # addendums
    for rel, txt in ADDENDUMS.items():
        append_section(rel, txt)
    print(f"✅ Wrote {len(NEW_DOCS)} new docs and appended {len(ADDENDUMS)} addendums into {BASE}")

if __name__ == "__main__":
    main()
