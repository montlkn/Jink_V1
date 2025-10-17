# AffinityEngine (Weighted Aesthetic Update)

## Summary
AffinityEngine updates a user's 9-archetype taste vector using weighted signals from actions (scan, derive, quest, contribute). It smooths noise with temporal decay, encourages variety with a surprise term, and keeps the vector stable with confidence-aware normalization.

## Entities
- Archetypes A: Classicist, Romantic, Stylist, Modernist, Industrialist, Visionary, PopCulturalist, Vernacularist, Austerist.
- User vector V size 9 (float), raw counts V_raw and normalized V_norm (sum to 1) for UI.
- Confidence c in [0,1] based on consistency over time.

## Inputs per action
- Action type t in {scan, derive_stop, quest_complete, contribute}.
- Style vector S (9-d) for the building or weighted centroid for a walk segment.
- Context K: novelty (first time vs repeat), distance, rarity, during_derive flag.

## Weights
- w_action: scan 1.0, derive_stop 0.7, quest_complete 0.9, contribute 0.5.
- w_context: novelty 1.2 else 0.8; rarity boost up to 1.2; during_derive 1.1.
- Learning rate alpha = base_alpha * w_action * w_context. Suggested base_alpha = 0.25.

## Update
1) Compute raw delta: d = normalize(S) * alpha.
2) Apply affinity/opposition coupling:
   - For each pair with positive affinity, add +lambda_aff * d_i to its partner.
   - For each opposition, subtract lambda_opp * d_i from its opposite.
   - Suggested lambda_aff = 0.15, lambda_opp = 0.12.

3) Surprise term (anti-bubble)
   - Identify underrepresented archetypes U where V_norm < tau (tau ~ 0.06).
   - Add epsilon_surprise to those components if S has non-zero mass there.
   - epsilon_surprise = 0.02 decaying with recent diversity.

4) Temporal smoothing
   - V_raw = (1 - beta) * V_raw + beta * (V_raw + d_coupled), beta = clamp(alpha * 0.6, 0.05, 0.35).
   - Maintain V_norm = softmax(V_raw / temp), temp in [0.8, 1.2] based on confidence.

5) Confidence update
   - If S aligns with top-3 of V_norm, c += eta_align (0.02), else c -= eta_mis (0.01).
   - Clamp c to [0.05, 0.98].

## Output
- Updated V_raw, V_norm, and c.
- Profile delta for UI: top_archetype_change, hue target, turbulence target.

## Notes
- Store both raw and normalized to avoid losing long-term history.
- Batch apply over session end to reduce jitter, or apply per event with small alpha.
- Log per-archetype deltas for analytics and tuning.



## Implementation Addendum v1.1 (Oct 2025)

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
