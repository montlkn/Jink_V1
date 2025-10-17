# AI Profile Summary – Implementation Plan (Revised)

> Version: 2.0 • Updated: 2025-10-17

## 1) Overview

Implement a reliable, privacy-safe service that generates and maintains a short, second‑person profile summary for each user based on their aesthetic preference distribution and recent activity. The system updates summaries only when the underlying distribution materially changes, with guardrails that keep costs, latency, and churn under control.

---

## 2) Goals & Non‑Goals

**Goals**

* Provide a concise profile summary (≤100 words) plus key phrases for UI surfaces.
* Update summaries only when the total variation distance between the current and baseline aesthetic distributions exceeds a configured threshold.
* Ensure determinism, safety, and observability of the generation pipeline.

**Non‑Goals**

* Long‑form bios, multi‑paragraph narratives, or open‑ended copywriting.
* Real‑time updates on every interaction.

---

## 3) Architecture Summary

* **Data sources:** aesthetic breakdowns, user interactions metadata.
* **Services:**

  * `divergence` util (pure function) for change detection.
  * `summary-generator` worker (queue-driven) for calling the LLM.
  * `summary-service` (HTTP) for reads/writes and orchestration.
* **Storage:** Postgres (primary), Redis (queue, locks, short‑lived cache).
* **Clients:** Web app, internal tools.

---

## 4) Data Model

```ts
// Percentages are 0..100 and will be normalized.
// All timestamps in ISO 8601 UTC.

export type AestheticBreakdown = Record<string, number>;

export interface ProfileSummary {
  userId: string;
  version: number;                // increments on generation
  text: string;                    // ≤ 100 words
  keyPhrases: string[];            // 3–7 items
  language: string;                // e.g. "en"
  tone: 'neutral' | 'casual' | 'formal';
  sourceModel: string;             // e.g. "gpt-4.x"
  generatedAt: string;             // timestamp
  baselineVersion: number;         // pairs with baselineBreakdown
  baselineBreakdown: AestheticBreakdown;
  baselineBreakdownHash: string;   // sha256 of normalized breakdown
  needsUpdate: boolean;            // set when divergence ≥ threshold but generation deferred
}

export interface ProfileSummaryMeta {
  userId: string;
  latestVersion: number;
  latestGeneratedAt: string;
  divergencePct: number;           // computed vs current breakdown
  thresholdPct: number;            // policy in effect when computed
}

export interface AestheticSnapshot {
  userId: string;
  snapshotAt: string;
  breakdown: AestheticBreakdown;
  sum: number;                     // stored for diagnostics
}
```

**Validation & Normalization**

* Accept any non‑negative values; normalize so the vector sums to exactly 100.0.
* Reject NaN/Infinity; clamp to [0, 100].
* Store `aestheticBreakdownSum` before normalization for audit.
* Unknown keys: either map to `other` or ignore with warning; feature‑flag controlled.

---

## 5) Divergence & Triggering Policy

**Total Variation Distance (L1/2)**

```ts
// Returns percentage points in [0, 100]
function totalVariation(oldMap: AestheticBreakdown, newMap: AestheticBreakdown): number {
  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  let l1 = 0;
  for (const k of keys) {
    const a = oldMap[k] ?? 0;
    const b = newMap[k] ?? 0;
    l1 += Math.abs(a - b);
  }
  return l1 / 2; // TV distance in percentage points
}
```

**Thresholding & Hysteresis**

* `triggerThresholdPct` default 6.
* `updateBaselineDeadbandPct` default 3. Baseline updates only when divergence falls below this after a regeneration, to avoid ping‑pong.
* Baseline freeze: do not move the baseline for at least `minBaselineAgeDays` (default 14) or until `minInteractionsSinceBaseline` is met (default 20).

**Decision**

* Normalize both vectors.
* Compute TV distance.
* If `tv ≥ triggerThresholdPct`, enqueue regeneration.
* Otherwise, do nothing.

---

## 6) Generation Flow

1. **Event triggers**

   * Post‑vote hook, periodic audit (daily), manual regenerate.
2. **Pre‑checks**

   * Rate limit: per user `X/min`, `Y/day`. Global concurrency cap. Circuit breaker on upstream error rate.
   * One in‑flight job per user via queue dedupe key `summary:user:{id}`.
3. **Job payload**

   * Normalized breakdown, recent interaction tags, language/tone preference, prompt hash, idempotency key.
4. **Prompt contract**

   * System: "You produce a second‑person profile summary under 100 words. Output strict JSON: { text, key_phrases }. No preamble."
   * Developer: style constraints, banned topics, max tokens.
   * User: compact table of top 6 aesthetics with percents, and 5–7 contextual bullets.
5. **Post‑processing**

   * JSON parsing with schema validation. Trim to 100 words. Remove PII and usernames.
6. **Persistence**

   * Write new `ProfileSummary`, increment `version`, set `baselineVersion = version`, store current normalized breakdown as new baseline and `baselineBreakdownHash`.
   * Maintain ring buffer of last 3 summaries for rollback.

---

## 7) API Surface

**Public (authenticated)**

* `GET /api/profile/summary?autogen=true|false`

  * Returns latest summary. If `autogen=true` and eligible, schedules regeneration asynchronously and returns current cached summary plus `meta`.
* `POST /api/profile/summary/regenerate`

  * Manual request. Accepts optional `reason` and `idempotencyKey`.
* `GET /api/profile/summary/meta`

  * Returns divergence, threshold, baseline and summary versions, timestamps, source model, and needsUpdate flag.

**Admin/ops**

* `POST /api/profile/summary/kill-switch { enabled: boolean }`
* `GET /api/profile/summary/audit?userId=...` (includes breakdown sums, hashes, prompt hash).

**Response shape (abbreviated)**

```json
{
  "summary": { "text": "...", "keyPhrases": ["..."], "generatedAt": "...", "version": 12 },
  "meta": { "divergencePct": 7.2, "thresholdPct": 6, "baselineVersion": 12, "needsUpdate": false }
}
```

---

## 8) Rate Limiting & Abuse Controls

* Token bucket per user: `burst=1`, `refill=1/10min`, `dailyCap=5`.
* Global circuit breaker: trip when upstream 5xx > 15% of last 200 calls; auto‑reset with exponential backoff.
* `?autogen=true` required to trigger work on a read path to guard against crawlers.

---

## 9) Frontend UX

* Show summary with: "Generated {relativeTime} • {absoluteTime}".
* Refresh button states: enabled, cooldown with countdown, disabled with reason tooltip.
* Skeleton reserves height for 3 lines to prevent layout shift.
* Show badge "Updated" when `summary.version > clientSeenVersion`.
* Language/tone selection persisted and sent with requests.

---

## 10) Observability

* Structured logs on every attempt: `userIdHash`, `model`, `latencyMs`, `tokensIn`, `tokensOut`, `result=ok|fail`, `failure_kind`.
* Metrics: success rate, P95 latency, cost per 1000 users, queue depth, breaker state, regeneration rate.
* Traces: one span around the model call with prompt hash tag.

---

## 11) Reliability & Ops

* Retries: jittered exponential backoff, max 3, then mark `needsUpdate=true` and fall back to cached summary.
* Idempotency: API accepts `Idempotency-Key` header; queue dedupe per user.
* Strict one in‑flight job per user enforced by Redis lock with TTL.

---

## 12) Testing Strategy

* **Unit**: normalization, total variation distance, hysteresis edge cases.
* **Property-based**: random vectors that don’t sum to 100; invariants hold after normalization.
* **Race tests**: concurrent vote storms + manual regenerate ensure exactly one summary persists.
* **Snapshot (golden) tests**: fixed inputs validate text changes across model versions.
* **Load**: soak with synthetic traffic; monitor breaker and queue behavior.

---

## 13) Security & Privacy

* Never include user names, emails, or IDs in prompts. Replace with neutral descriptors.
* Strip PII from context before generation. Validate with allowlist of context fields.
* Encrypt at rest; restrict access by service account with least privilege.
* Keep only the last 3 prompt/response hashes; avoid storing raw prompts unless under explicit debug flag.

---

## 14) Cost Controls

* Budget alerting: warn at 50/75/90% of monthly budget.
* Hard kill switch flips `AI_GENERATION_ENABLED=false` at 100%.
* Cache summaries aggressively; schedule audit window during off‑peak hours.

---

## 15) Rollout Plan

1. Dark‑launch meta endpoint and divergence computation.
2. Enable generation for 1% of users with elevated thresholds.
3. Observe metrics; tune thresholds and cooldowns.
4. Expand to 10%, then 100%.
5. Backfill baselines for all users.

---

## 16) Open Questions

* What is the minimum viable context that meaningfully improves quality without leaking PII?
* Do we need per‑segment thresholds (e.g., highly active users vs sporadic users)?

---

## 17) Reference Implementation Snippets

```ts
export function normalize(m: AestheticBreakdown): AestheticBreakdown {
  const entries = Object.entries(m).filter(([, v]) => Number.isFinite(v) && v >= 0);
  const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const scale = 100 / sum;
  return Object.fromEntries(entries.map(([k, v]) => [k, +(v * scale).toFixed(4)]));
}

export function totalVariation(oldMap: AestheticBreakdown, newMap: AestheticBreakdown): number {
  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  let l1 = 0;
  for (const k of keys) l1 += Math.abs((oldMap[k] ?? 0) - (newMap[k] ?? 0));
  return l1 / 2;
}

export function shouldRegenerate(oldMap: AestheticBreakdown, nextMap: AestheticBreakdown, thresholdPct = 6): boolean {
  const tv = totalVariation(normalize(oldMap), normalize(nextMap));
  return tv >= thresholdPct;
}
```

---

## 18) Risks & Mitigations

* **Thrash due to tiny shifts**: hysteresis window and baseline freeze.
* **Crawler storms**: explicit `autogen=true` and separate write path.
* **Cost spikes**: daily cap and breaker.
* **Model drift**: snapshot tests and sourceModel tracking.

---

## 19) Definition of Done

* All endpoints deployed with auth and rate limits.
* Observability dashboards live; budget alerts wired.
* E2E tests passing; load test within SLO.
* Rollout to 100% with stable regeneration rate and cost within budget.
