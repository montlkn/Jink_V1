# AESTHETIC PROFILE ALGORITHM — SPEC (official archetypes)

## Executive summary

Produces a per-user *aesthetic profile vector* over the 9 **core** archetypes. Fuses explicit signals (quiz), behavior (scans, likes, dwell), and visual signals (image embeddings). Incremental, idempotent, decay-aware. Powers recommendations, the passport/orb, and confidence/creator entitlements.

---

## Goals

* Stable, interpretable archetype scores (0–100).
* Fast UX updates and scalable batch processing.
* Discovery without filter bubbles.
* Confidence and provenance for every update.
* Auditable and easy to tune.

---

## Official archetypes (`K = 9`) + subtypes

Use these exact keys in storage, telemetry, and UI:

**Core (K = 9)**

* `classicist`
* `romantic`
* `stylist`
* `modernist`
* `industrialist`
* `visionary`
* `pop_culturalist`
* `vernacularist`
* `austerist`

**Subtypes (map to cores)**

* `infrastructuralist` → maps as a subtype of `industrialist`
* `naturalist` → maps as a subtype of `vernacularist`

(Keep keys stable. See framework doc for descriptions.) 

---

## Inputs (signals)

Events must include `event_uuid` and `timestamp`.

**High-signal**

* `quiz_answer` (onboard triads)
* `image_upload_analysis` (CLIP/embedding → archetype vector)
* `building_scan` (first-time and repeat, include building context)

**Medium**

* `building_like`, `building_save`, `add_note`, `share_building`, `route_complete`

**Low / auxiliary**

* `detail_view`, `dwell_time_15s/30s/60s+`, `quick_dismiss`, `skip_recommendation`, `unlike`

For building events attach `building_id, style_tags, significance_score, neighborhood`.

---

## Base action weights (config)

Adjustable constants. Example defaults:

| Action                     | Base weight |
| -------------------------- | ----------: |
| `quiz_answer`              |          10 |
| `image_upload_analysis`    |          14 |
| `building_scan:first_time` |          10 |
| `building_scan:repeat`     |           3 |
| `building_like`            |           6 |
| `building_save`            |           7 |
| `add_note`                 |           6 |
| `route_complete`           |           5 |
| `dwell_time_15s`           |           2 |
| `dwell_time_30s`           |           3 |
| `dwell_time_60s+`          |           5 |
| `detail_view`              |           3 |
| `share_building`           |           4 |
| `quick_dismiss`            |          -1 |
| `skip_recommendation`      |        -0.5 |
| `unlike`                   |          -3 |

Notes: image events are highest weight. First-time scans > repeats.

---

## Enrichment & per-event weighting

Each event is enriched with modifiers and then turned into archetype contributions.

1. **Contextual weight**

   ```
   contextual_weight = surprise_factor * (1 + significance_score/100) * style_boost
   ```

   * `alignment` = cosine(user_profile, building_profile) mapped to [0,1].
   * `surprise_factor` = 1.8 if alignment < 0.3; 0.7 if alignment > 0.8; else 1.0.
   * `significance_score` ∈ [0,100].
   * `style_boost` = 1.0 normally ; 1.1–1.4 if campaign/style match.

2. **Temporal weight** = recency decay (newer events stronger). See decay.

3. **Sequence bonus** = additive small bonus for patterns (e.g., 3 same-style scans in session → +1.5; 10 → +5). Session window default 90 minutes.

4. **Event total weight**

   ```
   w_event = base_weight * contextual_weight * temporal_weight + sequence_bonus
   ```

If event carries an `aesthetic_vector` (from image analysis or quiz), scale that vector by `w_event` and add to `raw_scores`.

---

## Temporal decay (logarithmic)

Older actions lose influence slowly.

```
decay(days) = max(min_decay, 1 / (1 + alpha * log(days + 1)))
effective_decay = decay(days) * importance^importance_exponent
```

Defaults: `alpha = 0.5`, `min_decay = 0.05`, `importance_exponent = 0.25`.
`importance` = raw_score / max_raw_score for archetype.

---

## Raw scores → normalize → store

* Maintain `raw_scores` (per-archetype additive). Store provenance option.
* On update:

  1. Apply decay to existing `raw_scores` since `last_updated`.
  2. Add contributions from the batch (weighted vectors).
  3. Compute `normalized_scores`:

     ```
     normalized[a] = max(0, raw[a]) / sum_j max(0, raw[j]) * 100
     ```
* Persist: `raw_scores`, `normalized_scores`, `last_updated`, `confidence`, `action_counts`, `embeddings_summary`.

---

## Confidence (0–100)

Use signals:

* `N_actions` → `baseConfidence = min(70, N_actions * 1.5)`
* `action_diversity` → `diversityBonus = action_diversity * 10`
* `visual_signal` → `visualBonus = min(20, num_images * 3)`
* `profile_consistency` → `consistencyBonus = (1 - entropy/ln(K)) * 15` where `K = 9`

Final:

```
confidence = clamp(0,95, baseConfidence + diversityBonus + visualBonus + consistencyBonus)
```

Cold-start lower bound: 10.

---

## Image & embedding pipeline

* Store `image_embedding` (512/1536-d).
* Map embedding → archetype vector via a trained mapping. Treat output as `image_upload_analysis` event with high weight.
* Keep `embedding_avg` on profile for cold-start similarity.

Training note: label images per archetype, include subtypes `infrastructuralist` and `naturalist` as specialized classifiers feeding their parent archetype.

---

## Alignment, novelty & surprise

* `alignment = clamp( (cosine(user_vec, building_vec) + 1) / 2, 0, 1 )`
* `novelty = 1 - popularity_score * user_exposure_norm`
* `surprise = 1 - alignment` bounded to [0.2, 0.9] when used as multiplier.

---

## Recommendation scoring (per building)

```
score = 0.6*alignment + 0.25*(significance_score/100) + 0.1*novelty + 0.05*surprise_bonus + diversity_bonus
```

Defaults: `w_align=0.6`, `w_significance=0.25`, `w_novelty=0.1`, `w_surprise=0.05`. Inject wildcards ~5% of results to encourage exploration. Favor “bridge” items that hit user’s top-2 archetypes.

---

## Cold-start & quiz

* **Quiz**: 18 triad/pairwise questions. Generate initial archetype vector as a strong `quiz_answer` event.
* If no quiz, use neighborhood/popularity priors and any image embeddings.

---

## Batch vs real-time rules

* Maintain per-worker action queue. Process per-user batch when:

  * `user_actions >= 10` OR `time_since_first_action >= 30s` OR `image_event_received`.
* High-weight events (image, quiz) => immediate processing. Lower-weight events can batch.

---

## Idempotency & reconciliation

* Require `event_uuid`. Reject duplicates.
* Accept offline events with original timestamps. Sort chronologically when applying. Ensure deterministic order per user.

---

## Telemetry & metrics

Export and monitor:

* `profile_update_rate`
* `recommendation_ctr` by alignment bucket
* `novelty_ctr` by novelty bucket
* `confidence_distribution`
* `archetype_distribution` global
* `salted_diversity_metric` (wildcard clicks)
* `profile_entropy` and drift rate
* `image_signal_ratio`

Anti-abuse: repeated identical events, device reuse, burst first-time scans.

---

## Anti-bias & discovery

* Inject `Aesthetic Wildcards` (default 5%).
* `Bridge recommendations` for top-2 archetype overlaps.
* Enforce `min_diversity` in top-20 results to avoid over-personalization.

---

## Testing & evaluation

* Unit tests: weighting, decay, normalization, idempotency.
* Offline evaluation: hold-out user sessions.
* Live A/B: wildcard 5% vs control.
* Curator QA on samples. Retrain image mapping when drift detected.

---

## Storage schema (recommended)

`user_profiles`:

* `user_id` PK
* `raw_scores` jsonb `{classicist: n, romantic: n, ... austerist: n}`
* `normalized_scores` jsonb `{...}`
* `embeddings_summary` jsonb
* `last_updated` timestamptz
* `confidence` numeric
* `action_counts` jsonb
* `source_provenance` jsonb (optional)

`building_profiles`:

* `building_id`
* `aesthetic_profile` jsonb `{arch: weight}`
* `significance_score` int 0–100
* `style_tags`, `neighborhood`, `popularity_score`

`events`:

* `event_uuid`, `user_id`, `type`, `payload`, `timestamp`, `processed boolean`

---

## Hyperparameters & ops

* `alpha_decay = 0.5`, `min_decay = 0.05`, `importance_exponent = 0.25`
* Surprise multiplier bounds `[0.7, 1.8]`
* Wildcard injection 5% (tune by CTR)
* Confidence cap 95, lower bound 10 for cold users
* Audit log for profile changes

---

## UX hooks

* Show confidence and top-3 archetypes with short descriptions (from your framework). 
* “Why recommended” text using the alignment/significance/novelty reasons.
* “Show me different” toggle to surface wildcards.
* Occasional re-quiz for drift detection.

---

## Example flows (brief)

**Image upload**

1. Image → embedding → archetype vector (`infrastructuralist`/`naturalist` map into parent).
2. Create `image_upload_analysis` event.
3. Immediate profile update. Emit `profile_update` and recalc confidence.

**Batch scans**

1. User scans builds in a session.
2. Sequence bonus applies.
3. Batch processed; apply decay and update scores.

---

## Appendix — key formulas

**Decay**

```
decay(days) = max(min_decay, 1/(1 + alpha * log(days + 1)))
effective = decay(days) * importance^importance_exponent
```

**Event weight**

```
w_event = base_weight * contextual_weight * temporal_weight + sequence_bonus
```

**Normalize**

```
normalized_i = max(0, raw_i) / sum_j max(0, raw_j) * 100
```

**Confidence**

```
confidence = clamp(0,95,
   min(70, N_actions*1.5) + action_diversity*10 + min(20, num_images*3)
   + (1 - entropy/ln(9))*15)
```

**Recommendation score**

```
score = 0.6*alignment + 0.25*significance + 0.1*novelty + 0.05*surprise
```

---