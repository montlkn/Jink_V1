# Contribution Logic (Submit → Verify → Reward)

## Summary
Users can submit missing data or corrections for buildings. Submissions go through a lightweight peer verification process that yields XP and raises contributor reputation.

## Flow
1) Compose: add text, optional media, citations.
2) Submit: write to contributions table with initial credibility 0.2.
3) Verify: peers upvote/downvote and a reviewer can mark verified.
4) Reward: verified contributions grant bonus XP; credibility adjusts future weighting.

## Tables
- contributions: id, user_id, building_id, text, media_urls, sources, credibility, status, created_at.
- contribution_votes: id, contribution_id, voter_id, vote in {+1, -1}, weight.
- user_reputation: user_id, rep_score, last_calc.

## Credibility
credibility = base + w_rep * normalized_rep + w_votes * net_votes_scaled + w_sources * source_quality
- base 0.2, w_rep 0.3, w_votes 0.3, w_sources 0.2; remainder reserved for staff verification.
- cap credibility to [0,1]. Verified bumps to ≥0.8.

## XP
- Submit: +5 XP (once per building per day).
- Verified: +40 XP.
- Highly-rated (cred ≥0.9): +20 bonus.

## UI
- Composer with minimal fields and clear guidance.
- Verification progress bar; transparent outcomes.



## Implementation Addendum v1.1 (Oct 2025)

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
