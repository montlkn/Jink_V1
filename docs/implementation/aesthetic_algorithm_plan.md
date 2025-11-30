# 🎨 User Aesthetic Algorithm - Implementation Plan

## Overview

This document outlines the implementation plan for the **User Aesthetic Profile Algorithm** that powers personalized recommendations, the passport/orb visualization, and walk curation.

**Current Status:**
- ✅ Building profiles: Scored with 9 archetypes (via aesthetic_categorization_v2.py)
- ✅ Quiz data: 18 questions with scoring defined (quiz_data.json)
- 🔄 User profiles: Need to implement
- 🔄 Event processing: Need to implement
- 🔄 Recommendation engine: Need to implement

---

## Phase 1: Database Schema (Immediate)

### 1.1 User Profiles Table

```sql
-- Migration 006
CREATE TABLE public.user_aesthetic_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Raw scores (additive, before normalization)
    raw_scores JSONB DEFAULT '{
        "classicist": 0, "romantic": 0, "stylist": 0, "modernist": 0,
        "industrialist": 0, "visionary": 0, "pop_culturalist": 0,
        "vernacularist": 0, "austerist": 0
    }',
    
    -- Normalized scores (0-100, sum to 100)
    normalized_scores JSONB DEFAULT '{
        "classicist": 11.11, "romantic": 11.11, "stylist": 11.11, "modernist": 11.11,
        "industrialist": 11.11, "visionary": 11.11, "pop_culturalist": 11.11,
        "vernacularist": 11.11, "austerist": 11.11
    }',
    
    -- Metadata
    confidence DOUBLE PRECISION DEFAULT 10,
    action_counts JSONB DEFAULT '{}',
    embeddings_summary JSONB,
    
    -- Quiz completion
    onboarding_quiz_complete BOOLEAN DEFAULT FALSE,
    quiz_completed_at TIMESTAMPTZ,
    
    -- Timestamps
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 User Aesthetic Events Table

```sql
-- Migration 007
CREATE TABLE public.user_aesthetic_events (
    event_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    building_bbl VARCHAR(10),
    payload JSONB NOT NULL DEFAULT '{}',
    aesthetic_vector JSONB,
    
    base_weight DOUBLE PRECISION,
    contextual_weight DOUBLE PRECISION DEFAULT 1.0,
    final_weight DOUBLE PRECISION,
    
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Core Algorithm

### 2.1 Config Constants

```typescript
export const ACTION_WEIGHTS = {
  quiz_answer: 10,
  image_upload_analysis: 14,
  'building_scan:first_time': 10,
  'building_scan:repeat': 3,
  building_like: 6,
  building_save: 7,
  add_note: 6,
  route_complete: 5,
  detail_view: 3,
  quick_dismiss: -1,
  unlike: -3,
};

export const DECAY = { alpha: 0.5, minDecay: 0.05 };
export const REC_WEIGHTS = { alignment: 0.6, significance: 0.25, novelty: 0.1, surprise: 0.05 };
```

### 2.2 Key Functions

1. **updateUserProfile()** - Apply decay, add event contributions, normalize
2. **calculateEventWeight()** - Base × contextual × temporal + sequence bonus
3. **normalizeScores()** - raw[i] / sum(raw) × 100
4. **calculateConfidence()** - Based on action count, diversity, consistency
5. **getRecommendations()** - Score buildings by alignment + significance + novelty

---

## Phase 3: Implementation Order

| Step | Task | Status |
|------|------|--------|
| 1 | Run migration 005 (building columns) | 🔄 Do now |
| 2 | Score full dataset with v2 | 🔄 Do now |
| 3 | Push scores to Supabase | 🔄 Do now |
| 4 | Create migration 006 (user profiles) | Next |
| 5 | Create migration 007 (events) | Next |
| 6 | Implement core algorithm (TypeScript) | Week 2 |
| 7 | Quiz integration | Week 2-3 |
| 8 | Event processing | Week 3 |
| 9 | Recommendations API | Week 4 |
| 10 | UI components | Week 4-5 |

---

## Immediate Action Items

```bash
# 1. Run migration in Supabase SQL Editor
# Copy: /Users/lucienmount/coding/nyc_scan/backend/migrations/005_add_aesthetic_columns.sql

# 2. Score full dataset
cd /Users/lucienmount/coding/aesthetic-scoring
python run_scoring_v2.py \
  --input /Users/lucienmount/coding/nyc_scan/backend/data/final/full_dataset.csv \
  --output /Users/lucienmount/coding/aesthetic-scoring/data/output/full_dataset_scored.csv

# 3. Push to Supabase (dry run first)
python scripts/update_supabase_aesthetics.py \
  --csv data/output/full_dataset_scored.csv \
  --dry-run

# 4. Actually push
python scripts/update_supabase_aesthetics.py \
  --csv data/output/full_dataset_scored.csv
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `/migrations/005_add_aesthetic_columns.sql` | Building aesthetic columns |
| `/migrations/006_user_aesthetic_profiles.sql` | User profile table (create next) |
| `/migrations/007_user_aesthetic_events.sql` | Event tracking table (create next) |
| `/lib/aesthetic/*` | Core algorithm (TypeScript) |
| `/components/quiz/OnboardingQuiz.tsx` | Quiz UI |
| `/hooks/useAestheticProfile.ts` | Profile hook |
