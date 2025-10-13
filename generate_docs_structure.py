import os

BASE = "/Users/lucienmount/Arch_App_V2/architecture-app/docs/docs2"

DOCS = {
# ====================== RISK & FAILURE / ERROR HANDLING ======================
"frontend/error_states.md": """# Error States and Failure Handling

## Summary
Defines user-facing states and recovery paths for camera scans, GPS, network, and backend failures. The goal is graceful degradation: never a dead-end, always a suggestion.

## Error Taxonomy
- CAMERA_PERMISSION_DENIED: user blocked camera access.
- LOCATION_PERMISSION_DENIED: user blocked location access.
- LOW_GPS_ACCURACY: HDOP too high or no recent fix.
- SCAN_CONFIDENCE_LOW: CLIP match below threshold.
- NETWORK_OFFLINE: no connectivity.
- EDGE_TIMEOUT: /scan/identify or other RPC exceeds SLA.
- RLS_FORBIDDEN: Supabase row-level security denial.
- SUBSCRIPTION_REQUIRED: action gated behind Pro.

## UI Patterns
- Inline, non-blocking banners with a single action.
- Persistent retry affordance on scan result card.
- Soft haptics for recoverable errors, none for fatal.

## Recovery Flows
- CAMERA_PERMISSION_DENIED: present OS prompt link and a “Try demo mode” option that uses gallery images with geofenced samples.
- LOCATION_PERMISSION_DENIED: show “Proceed without location” which narrows search by visual similarity only; lowers confidence threshold visibly in UI.
- LOW_GPS_ACCURACY: show “Move a few steps or hold steady” tip; postpone calling /scan/identify for up to 3 seconds to stabilize.
- SCAN_CONFIDENCE_LOW: ask user to confirm from top-3 candidates; confidence accepted becomes user_verified flag for model tuning.
- NETWORK_OFFLINE: queue scan event locally; show an offline badge and “Will sync later.”
- EDGE_TIMEOUT: offer retry with backoff; show time remaining dots to avoid perceived freeze.
- RLS_FORBIDDEN: refresh auth token; if persists, sign-out fallback with state backup.
- SUBSCRIPTION_REQUIRED: show Pro explainer sheet with clear benefit mapping, not a hard wall.

## Telemetry
- Log error_code, context (screen, action), retry_count, user_action (retry, cancel). Use this to prune noisy states.

## SLA Targets
- /scan/identify p95 under 900 ms.
- Route/derive p95 under 1200 ms.
- Search/autocomplete p95 under 200 ms.

""",

# ====================== AUTH, SECURITY, PERMISSIONS ==========================
"backend/auth_permissions.md": """# Auth, Security, and Permissions (Supabase RLS)

## Summary
Security posture and row-level security (RLS) policies for core tables. JWT-based auth with service-role functions for privileged RPCs.

## Authentication
- Supabase Auth with email or OAuth.
- JWT includes user_id; frontend stores short-lived session and refresh token in secure storage.
- Service role keys used only in edge functions, never in client bundle.

## RLS Principles
- Default deny on all tables.
- Allow read on public building metadata.
- Writes are user-scoped where possible.
- Admin and verifier roles restricted to server-only functions.

## Example Policies (described)
- profiles: user can select row where user_id = auth.uid(); insert on signup; update limited to allowed columns (total_xp, level, vector).
- scans: user can insert where user_id = auth.uid(); read only own scans.
- passport_entries: user can insert/output only own; prevent duplicates by (user_id, building_id) unique index.
- contributions: insert by auth.uid(); select by verified status or own; updates limited to status via verifier function.
- xp_transactions: insert via edge function with service role; select own only.

## Secrets Hygiene
- All API keys stored as environment variables on the edge runtime.
- No secrets in client; runtime feature flags delivered via signed config endpoints.

""",

# ====================== SUBSCRIPTIONS / ENTITLEMENTS =========================
"backend/subscriptions.md": """# Subscriptions and Entitlements

## Summary
Defines Free vs Pro, entitlements, billing integration, and enforcement. XP is orthogonal; subscription only widens feature access and multipliers.

## Tables
- plans: id, name (Free, Pro), price_monthly, trial_days, features_json.
- subscriptions: id, user_id, plan_id, status (active, past_due, canceled), current_period_end, provider (stripe), provider_sub_id.
- entitlements: id, user_id, key (deep_dive_credits, custom_derives, orb_customization), value, updated_at.

## Flow
- On purchase: webhook upserts subscription row; sets status active; grants default entitlements per plan.
- On renewal or cancel: webhook updates status and recalculates entitlements.
- In app: check entitlements cache first; refresh via /entitlements/refresh endpoint daily or on 401.

## Enforcement
- Pro-only actions call an entitlement check edge function. If false, return SUBSCRIPTION_REQUIRED with a message including the benefit mapping.

## Grace
- If subscription lapses, creator unlocks remain visible but disabled; user can still view their past content.

""",

# ====================== ORB SHADER STRUCTURE / COLOR MAP =====================
"frontend/orb_shader_map.md": """# Orb Shader Structure and Color Mapping

## Summary
Defines shader layers, uniforms, and color mapping from aesthetic vector to visual state. Ensures consistent appearance across screens.

## Layers
- Base sphere: simple BRDF or lambertian with subtle specular.
- Noise displacement: 3D simplex noise; amplitude tied to confidence inverse.
- Rim light: angle-based intensity; strengthens on XP pulses.
- Ripple layer: radial expansion for success events.

## Uniforms
- uTime: seconds since mount for animation.
- uScale: base scale multiplier on XP deltas.
- uTurbulence: 0 to 1; inversely tied to profile confidence.
- uHuePrimary: 0–360 based on top archetype.
- uHueSecondary: accent hue from second archetype.
- uPulse: 0–1 transient for event ripple.
- uEnergy: composite of recent XP and drift magnitude.

## Color Mapping
- Classicist 36, Romantic 24, Stylist 310, Modernist 200, Industrialist 20, Visionary 270, PopCulturalist 340, Vernacularist 110, Austerist 45.
- Blend primary to secondary by their normalized weights; clamp saturation on low confidence to avoid muddy visuals.

## Performance
- Cap fragment shader complexity; prefer precomputed LUTs for hue-to-RGB.
- On low-end devices, freeze uTime updates and drive only uScale and uHuePrimary changes.

""",

# ====================== SEARCH INDEXING / PGVECTOR + FTS =====================
"backend/search_indexing.md": """# Search Indexing (FTS + Vector Hybrid)

## Summary
Two-level index: fast text search via Postgres FTS; semantic fallback via pgvector. Exa candidates reconcile with local IDs.

## Indexes
- FTS: to_tsvector on buildings(name, alt_names, neighborhoods).
- Vector: pgvector 512-d for building embeddings.

## Query Orchestration
- Text first: if query has name/address tokens, run FTS weighted by field.
- If recall < k or query is descriptive, embed query via exa or local model; run vector search (cosine).
- Merge: union results by building_id; score = 0.6 * fts_score + 0.4 * cosine_sim; rerank by distance, novelty, archetype affinity.

## Refresh
- Recompute vectors on new photos or model upgrade; version vectors with model_id for reproducibility.

## Diagnostics
- Log per-query hit sources (fts, vector, both) to monitor costs and quality.

""",

# ====================== TESTING IMPLEMENTATION / CI ==========================
"meta/testing_implementation.md": """# Testing Implementation Plan (CI)

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
- Build release candidate for the chosen platform; run Detox smoke tests.

## Fixtures
- Provide golden vectors, sample building metadata, offline scan queue.

## Flake Strategy
- Retries x2 on E2E; quarantine failing tests with owner tags; track flake rate.

""",

# ====================== ANALYTICS / TELEMETRY ================================
"backend/analytics_events.md": """# Analytics Events and Telemetry

## Summary
Minimal, privacy-respecting events to measure product health and guide tuning.

## Event Schema (fields)
- event_name, user_id (hashed), ts_iso, context (screen, city), payload_json.

## Core Events
- scan_start, scan_success, scan_fail
- derive_start, derive_finish
- quest_accept, quest_complete
- contribution_submit, contribution_verified
- xp_gain (with reason), level_up
- subscription_activate, subscription_cancel
- error (error_code, recoverable, retry_count)

## KPIs
- Scan success rate p95 time
- First week retention
- Avg stamps per active user
- Derive start→finish conversion
- Contribution verification rate

## Privacy
- No precise addresses; round lat/lon or bucket by tiling.
- Honoring OS-level analytics opt-out.

""",

# ====================== CREATIVE LAYER: LOADING / MODALS / ANIMATION =========
"frontend/loading_transitions.md": """# Loading Transitions and Screen Hand-offs

## Summary
Unify motion language across major transitions so the app feels alive without feeling busy.

## Principles
- Never teleport; hint directionality.
- Orb is the anchor; it should lead your eye during transitions.

## Patterns
- Home → Camera: orb grows and settles into capture node; background blurs briefly to focus attention.
- Scan → Result: ripple from orb center, card rises from bottom with a slight spring.
- Result → Derive: orb drifts to map center then shrinks to a locator pulse.

## Timing
- In transitions 160–220 ms; out transitions 120–160 ms.
- Keep at most two simultaneous animated properties per element.

""",

"frontend/modal_system.md": """# Modal System (Sheets and Overlays)

## Summary
Defines bottom sheets and full-screen modals for search, contribute, and summaries.

## Rules
- Single stack; no nested sheets.
- Backdrop blur strength reflects context importance.
- Swipe-to-dismiss threshold is 35% height or velocity trigger.

## Components
- BaseSheet: header, content slot, safe area.
- ActionSheet: quick actions with icons.
- ConfirmSheet: two-step confirmation for destructive actions.

""",

"frontend/animation_states.md": """# Animation States and Constants

## Summary
Shared constants to keep motion coherent and debuggable.

## Constants
- DUR_SHORT 120 ms, DUR_MED 180 ms, DUR_LONG 260 ms.
- EASE_IN_OUT cubic with gentle overshoot for success states.
- HAPTIC_TAP light on press; HAPTIC_SUCCESS medium on scan success.

## State Map
- ORB_IDLE, ORB_PRESS, ORB_PROCESSING, ORB_SUCCESS, ORB_FAIL.
- Use a simple finite state machine; transitions guarded by debounce windows.

""",

# ====================== CREATIVE LAYER: VISUAL ETHOS =========================
"product/visual_ethos.md": """# Visual Ethos

## Summary
JINK should feel like graphite and light. Minimal typography, generous white space, and a living orb that breathes.

## Principles
- Earn attention, don’t demand it.
- Prefer calm gradients over saturated candy.
- Text is sparse and precise; the orb speaks first.

## Materials
- Matte surfaces, light grain on backgrounds.
- Subtle shadows; no hard strokes.

## Sound
- Soft confirmation tones only on major events; default silent.

""",

# ====================== AESTHETIC PROFILE: EXAMPLES ==========================
"systems/aesthetic_profile/examples.md": """# Aesthetic Profile Examples

## Summary
Example vectors and drifts to validate AffinityEngine behaviors.

## Example 1: New User (Classicist-leaning)
- Initial V_norm: Classicist 0.28, Modernist 0.18, Stylist 0.14, others thinly distributed.
- After scanning two Beaux-Arts and one Brutalist:
  - Drift: Classicist +0.03, Modernist +0.01 from opposition dynamics, Industrialist +0.008 via affinity.
  - Confidence: +0.04 due to alignment with top-3.

## Example 2: Diversity Push
- User stagnates in Modernist; surprise term nudges Vernacularist and Romantic after a timber pavilion scan.
- Confidence stays stable; noise amplitude reduced slightly.

## Example 3: Derive Session
- 7-stop walk; centroid vector favors Visionary and PopCulturalist.
- Post-walk profile shows small but broad shift; orb hue briefly trends violet before settling.

""",
}

def write_docs(base: str, docs: dict):
    for rel_path, content in docs.items():
        full_path = os.path.join(base, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"✅ Wrote {len(docs)} detailed docs to {base}")

if __name__ == "__main__":
    write_docs(BASE, DOCS)
