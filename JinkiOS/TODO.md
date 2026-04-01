# Jink iOS — Remaining Issues from Field Test (2026-03-19)

## Scan Reliability & Accuracy
- [ ] **Scan degradation over session** — accuracy worsens with more scans (346 Broadway → wrong building, Woolworth → 120 Nassau). Investigate if GPS drift, cache pollution, or state accumulation
- [ ] **Woolworth took 5+ attempts** — urban canyon + scaffolding. Consider: wider scan cone, multi-frame capture, or fallback to name/address text recognition
- [ ] **Missing buildings in DB** — Oculus, Perlman Center for the Arts, WTC complex buildings, Home Life Building. Add to `buildings_full_merge_scanning` table
- [ ] **Wrong building data** — WTC 1 returns 1973 Yamasaki building (demolished). Need to update/replace with Freedom Tower (2014, SOM/David Childs). Check for other demolished→rebuilt buildings
- [ ] **Wrong address labeling** — One WTC showing incorrect address. Verify address data in Supabase

## Data Quality (Backend/Pipeline)
- [ ] **Fix lore_generator.py prompt** — currently returns multiple "Option 1/Option 2" responses. Change prompt to return single authoritative paragraph. Re-run for affected buildings
- [ ] **Storytelling tone** — too casual ("Hold up, did you know...", "secret twin!"). Update Gemini prompt to formal informational tone befitting an architecture reference app
- [ ] **Tax/archival photos wrong** — showing generic NYC archive cover pages for every building. Fix photo lookup in `ArchivalPhotoSection` — likely BBL→photo URL mapping is broken
- [ ] **Materials enrichment** — most buildings show "unknown". Add materials enrichment step to pipeline (Exa AI or LPC data). Woolworth should be "terra cotta, limestone"
- [ ] **Apple Landmarks integration** — investigate porting Apple Photos landmark data to fill gaps (Home Life Building etc.)

## Walk/Jink Navigation
- [ ] **Distance pill not updating live** — `WalkViewModel` tracking loop runs every 5s with 5m distance filter. Consider: reduce to 2s loop, 3m filter for more responsive feel
- [ ] **Direction granularity at close range** — at 500ft just says "destination to left/ahead/right". Need finer step-by-step at close range. Consider: sub-step interpolation or compass-based arrow
- [ ] **Aesthetic algorithm verification** — confirm walk building selection actually uses aesthetic profile scores. Log/debug the ranking to verify
- [ ] **AR activation threshold** — currently 20m. User wants ~150m (500ft) with finer directions. Add on-demand AR button alongside existing 3 buttons
- [ ] **Navigation assistance** — user needs more help finding buildings. Options: (a) on-demand AR button, (b) mini-map overlay, (c) radar view, (d) Apple Maps turn-by-turn integration
- [ ] **Building confirmation blocked** — user couldn't verify buildings on jink. Debug the full verification flow
- [ ] **Dwell timer should pause** — when app backgrounds or phone sleeps, pause the dwell timer. Use `scenePhase` observation

## Explore Map
- [ ] **UI cleanup** — "Done" button placement awkward under locate button. Apple Maps link under search bar. Review layout
- [ ] **Consider Mapbox** — for Nolli-style map aesthetic. Apple MapKit is functional but limited in styling
- [ ] **Community posts feature** — NEW FEATURE: toggle button (idea bubble icon, top-right of scan view) to capture community moments (photo + text + location) instead of building scans. Show on map for all users with distinct pin type/color

## XP System
- [ ] **Verify XP accumulation end-to-end** — after Tier 1 refresh fix ships, verify XP actually increments correctly in `user_achievements` table
- [ ] **Level progression UI** — ensure level bar updates, tier transitions work

## BuildingInfoView Polish
- [ ] **Inconsistent writeups** — some buildings have good content, others show raw Gemini prompt. Audit `storytelling` column for all buildings, re-generate bad entries
- [ ] **Capitalize architect/style names** — screenshots show "cass gilbert", "neo-gothic" in lowercase. Apply `.capitalized` or title case
- [ ] **Hide empty fact rows** — don't show "nd", "not determined", "unknown", "0" values. Only display facts that have real data

## Backend Scan API
- [ ] **V2 scan endpoint** — verify V2 is the active endpoint being called from iOS
- [ ] **Pre-compute CLIP embeddings** — batch process all 1.08M buildings to eliminate on-demand encoding
- [ ] **Redis caching** — cache scan results by GPS grid to avoid re-processing nearby locations
- [ ] **Reduce Street View API calls** — pre-fetch and cache reference images

## Sentry
- [ ] **Review and resolve all Sentry errors** — check Sentry dashboard, triage by frequency, fix top errors

## Infrastructure
- [ ] **Modal scaledown_window** — currently 60s. Consider increasing to 300s to reduce cold starts during active usage
- [ ] **Monitor GPU costs** — after T4 enablement, track spend vs usage patterns
