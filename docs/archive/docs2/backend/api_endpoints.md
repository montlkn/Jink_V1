# Backend API Endpoints (v1)

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
