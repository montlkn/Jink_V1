# Aesthetic Profile System - Complete Implementation Roadmap

**Version**: 2.0
**Status**: 70% Complete (Phases 1-7 done, 8-10 remaining)
**Last Updated**: November 30, 2025
**Author**: Design review with user feedback integration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Completed Phases (1-7)](#completed-phases-1-7)
3. [In Progress (Phase 8)](#in-progress-phase-8)
4. [Remaining Phases (9-10)](#remaining-phases-9-10)
5. [System Architecture](#system-architecture)
6. [Key Feedback Integration](#key-feedback-integration)
7. [Critical Files Reference](#critical-files-reference)
8. [Implementation Timeline](#implementation-timeline)

---

## Executive Summary

A complete system for building and evolving user aesthetic profiles across 9 core archetypes (classicist, romantic, stylist, modernist, industrialist, visionary, pop_culturalist, vernacularist, austerist). Combines explicit signals (quiz), behavioral events (scans, likes, walks), and visual signals (embeddings). Powers personalized building recommendations, passport/orb visualization, and exploration incentives.

### Key Principles (from original spec + feedback)

✅ **Simplified Approach**: Uses pragmatic algorithms, not over-engineered complexity
✅ **Client-First**: Client-side processing for immediate feedback and offline capability
✅ **Decay Simplified**: 5% weekly multiplicative decay (not complex logarithmic formula)
✅ **Confidence Straightforward**: `min(95, 10 + (totalActions * 2))` (not magic number formula)
✅ **Time-Constrained**: Routes respect user's time selection (70-85% buffer)
✅ **Fallback Tiers**: Aesthetic → Behavioral/Novelty → Wildcard (2.5x XP reward)
✅ **Building-Centric Identifier**: Uses BIN (Building ID Number) not BBL
✅ **Open Source**: Uses free/open APIs (no paid routing services required)

### Not Implemented (V2 Candidates)

- Server-side reconciliation Edge Function (client-side sufficient for MVP)
- Subtype resolution (Infrastructuralist, Naturalist map to parents)
- A/B testing infrastructure (planned Phase 10)
- Image embedding pipeline (CLIP/embeddings - deferred)
- Advanced decay with importance-weighting (simple decay works)

---

## Completed Phases (1-7)

### Phase 1: Database Schema ✅

**Created**: November 2025

#### Events Table
- `user_aesthetic_events`: Tracks all interactions (quiz, scans, likes, saves, walks)
- Stores building aesthetic profiles and event weights
- Tracks processed status for client-side algorithm
- Row-level security enabled

**Files**:
- Migration: `supabase/migrations/20251130_create_aesthetic_events.sql`

#### Enhanced Profiles
- `user_aesthetic_profiles` now has:
  - `raw_scores`: Additive scores (0-∞ scale per archetype)
  - `normalized_scores`: Percentages summing to 100
  - `action_counts`: Frequency tracking
  - `confidence`: 10-95 scale
  - `last_decay_timestamp`: Temporal tracking
  - `total_events_processed`: Counter

**Files**:
- Migration: `supabase/migrations/20251130_enhance_aesthetic_profiles.sql`

---

### Phase 2: Core Algorithm ✅

**Created**: November 2025

#### Constants & Configuration
**File**: `src/config/aestheticAlgorithm.ts`

- 9 core archetypes defined
- Action weights configured (quiz: 10, scan: 10/3, like: 6, save: 7, route: 5)
- **Simplified decay**: 5% weekly (`weeklyDecayMultiplier: 0.95`)
- **Simplified confidence**: `min(95, 10 + (totalActions * 2))`
- Recommendation weights: 60% alignment + 25% significance + 10% novelty + 5% surprise
- Batch thresholds: 10 events or 30 seconds

#### Core Functions
**File**: `src/services/aestheticAlgorithmService.ts`

- `applyDecayToProfile()`: Applies 5% weekly decay
- `calculateConfidence()`: Simple linear formula
- `addColdStartNoise()`: ±5% randomization for new users
- `calculateNormalizedScores()`: Converts raw to percentages
- `normalizeScores()`: Sums to 100

**Key Decision**: Rejected complex logarithmic decay. User feedback: "Consider starting simpler and adding complexity based on real usage data." ✅ Implemented.

---

### Phase 3: Event Collection ✅

**Created**: November 2025

#### Building Scan Events
**File**: `src/screens/Scan/ScanScreen.js`

- Tracks first-time vs repeat scans
- Stores scanned buildings in AsyncStorage
- Fetches building aesthetic profile automatically
- Creates events with proper weights

#### Like/Save Events
**File**: `src/screens/Scan/BuildingInfoScreen.tsx`

- Tracks building likes/unlikes
- Tracks saves
- Visual feedback with heart icon
- Creates weighted events

#### Walk Completion Events
**File**: `src/features/walks/mutations.ts`

- Creates 'route_complete' event
- Includes walk_id and timestamp
- Updates daily streak
- Clears taste cache every 5 walks

---

### Phase 4: Client-Side Processing ✅

**Created**: November 2025

#### Event Gateway
**File**: `src/services/gateways/aestheticEventGateway.ts`

- `createAestheticEvent()`: Creates and queues/submits events
- Hybrid batching:
  - **Immediate**: quiz_answer, route_complete
  - **Batched**: scans, likes, saves (when 10+ events or 30s elapsed)
- Fetches building aesthetic profiles
- Calculates event weights

#### Profile Processor
**File**: `src/services/aestheticProfileProcessor.ts`

- `processEventsClientSide()`: Main processing function
- Loads profile and unprocessed events
- Applies decay, processes events, normalizes scores
- Updates database and marks events processed

#### Background Sync
**File**: `App.tsx`

- AppState listener for foreground detection
- Flushes event queue when app comes to foreground
- Ensures offline events sync

---

### Phase 5: UI Components ✅

**Created**: November 2025

#### Quiz Results Screen
**File**: `src/screens/Quiz/QuizResultsScreen.tsx`

Two-phase animation:
- **Phase 1** (3 sec): Orb with typewriter "CALCULATING YOUR PROFILE" animation
- **Phase 2**: Fade in results with primary/secondary archetypes

Features:
- Quiz accuracy calculation (based on answer decisiveness)
- Primary + secondary archetype cards
- Archetype descriptions and vibe tags
- Error handling with retry option
- Fixed orb colors and glow rendering

#### Navigation Integration
**Files**: `src/navigation/routes.ts`, `Stack.tsx`, `screenLoaders.ts`

- Added QuizResults route
- Lazy loading for performance
- Updated OnboardingQuizScreen navigation

#### Profile Updates
**File**: `src/features/home/useHomeData.ts`

- useFocusEffect to refetch profile on screen focus
- Updates home orb after quiz completion

#### Retake Quiz
**File**: `src/screens/Profile/ProfileDetailScreen.js`

- "Retake Quiz" button
- Deletes previous responses
- Refreshes profile

**Key Decision**: User feedback: "Quiz → Results flow UX gap - doesn't specify how to handle user quits mid-quiz, network failures, re-taking quiz." ✅ All implemented with error handling.

---

### Phase 6: Recommendation Engine ✅

**Created**: November 2025

#### Building Scoring Service
**File**: `src/services/recommendationService.ts`

Scoring formula (per building):
- 60% **Alignment**: Cosine similarity of profiles
- 25% **Significance**: Architectural importance
- 10% **Novelty**: Age-based (older = more novel)
- 5% **Surprise**: Inverse alignment for variety

Functions:
- `scoreBuilding()`: Single building score
- `scoreBuildings()`: Batch scoring with sorting
- `segmentRecommendations()`: Split into tiers (60/35/5)
- `calculateAlignmentScore()`: Cosine similarity
- Human-readable "reasons" for each recommendation

#### Walk Integration
**File**: `src/screens/Walk/WalkStartScreen.js`

- Fetches user aesthetic profile
- Scores nearby buildings after fetching
- Segments into recommendation tiers
- Enhances buildings with:
  - `recommendationScore` (0-100)
  - `recommendationTier` (top/medium/wildcard)
  - `buildingScore` (full breakdown)
- Graceful fallback if scoring fails

**Key Decision**: User feedback: "60/5 recommendation split - where's the other 35%?" ✅ Fixed to explicit 60% top, 35% medium, 5% wildcard. Updated `segmentRecommendations()` to match.

---

## In Progress (Phase 8)

### Phase 8: Time-Constrained Route Optimization 🔄

**Status**: Plan approved, ready for implementation
**Timeline**: 3 weeks
**Reference**: `/Users/lucienmount/.claude/plans/glimmering-painting-blossom.md`

#### Overview

Filter buildings by aesthetic alignment AND time reachability. Use 70-85% of selected walk duration. Three-tier fallback system:
1. **Aesthetic Tier**: Buildings matching user's profile (>40% alignment)
2. **Behavioral Tier**: Buildings similar to past scans (if <5 aesthetic matches)
3. **Wildcard Tier**: Exploration mode (if avg alignment <20%) → **2.5x XP bonus**

#### Architecture

```
User selects time (10 min)
  ↓
Fetch nearby buildings (1000m radius)
  ↓
Score by aesthetic alignment
  ↓
IF avg alignment >40%:
  Filter to matching buildings (>40% score)
  Sort by 70% aesthetic + 30% proximity
ELSE IF <5 matches:
  Use behavioral/novelty fallback
  Score by past interactions + rare styles
ELSE (avg alignment <20%):
  Wildcard mode → 2.5x XP bonus
  ↓
Greedy time-constrained selection:
  Start with closest building
  Add buildings while time_used < (target * 85%)
  Stop when budget exhausted
  ↓
Optimize route order (nearest-neighbor + 2-opt)
  ↓
Return 3-6 buildings matching time + aesthetic
```

#### New Services

**File**: `src/services/routeBuilderService.ts` (NEW)

- `buildTimeConstrainedRoute()`: Main entry point
- `greedyTimeSelection()`: Add buildings until time exhausted
- `calculateBehavioralSimilarity()`: Compare to past scans
- `calculateNoveltyScore()`: Reward rare styles

Constants:
- `AESTHETIC_THRESHOLD = 40` (min alignment for aesthetic mode)
- `WILDCARD_THRESHOLD = 20` (avg score below = wildcard)
- `TIME_BUFFER_MIN = 0.70` (use min 70% of time)
- `TIME_BUFFER_MAX = 0.85` (use max 85% of time)
- `WALKING_SPEED_KMH = 4.5` (Haversine-based estimate)

**File**: `src/services/gateways/userBehaviorGateway.ts` (NEW)

- `getUserBehavioralHistory()`: Fetch past scans/likes
- Tracks architectural style, year, architect from past interactions
- Returns `seenStyles` frequency map

#### XP Multiplier System

**File**: `src/features/walks/mutations.ts` (MODIFY)

- Add `wildcardMultiplier` parameter to `completeWalk()`
- Pass multiplier through event payload
- Apply 2.5x bonus for wildcard walks

**File**: `src/services/gateways/supabaseGateway.ts` (MODIFY)

- Update `awardXp()` to accept `routeTierMultiplier`
- Combined calculation: `duration_bonus × streak_bonus × route_tier`

#### UI Enhancements

**File**: `src/screens/Walk/WalkNavScreen.js` (MODIFY)

- Show route tier badge:
  - 🎲 "EXPLORATION MODE • 2.5x XP" for wildcard
  - 🔍 "DISCOVERY MODE • Based on your past interests" for behavioral
- Show time match indicator

#### Implementation Steps

**Week 1**:
- Create `routeBuilderService.ts` (Days 1-3)
- Create `userBehaviorGateway.ts` (Day 4)
- Unit tests (Day 5)

**Week 2**:
- Integrate into WalkStartScreen (Days 1-2)
- Add XP multiplier system (Days 3-4)
- Add UI badges (Day 5)

**Week 3**:
- End-to-end testing (Days 1-2)
- Edge case testing (Day 3)
- Threshold tuning (Day 4)
- User testing (Day 5)

#### Optional V2: OSRM Integration

Use Open Source Routing Machine for accurate walking routes:
- Free public instance: `http://router.project-osrm.org/`
- Deferral reason: External API dependency, network latency, Haversine is 85-90% accurate

---

## Remaining Phases (9-10)

### Phase 9: Testing & Quality Assurance 📋

**Status**: Not started
**Timeline**: 3 weeks
**Objectives**: 80%+ unit test coverage, all edge cases handled, performance verified

#### 9.1 Unit Tests

**Files to create**:
```
src/services/__tests__/
├── aestheticAlgorithmService.test.ts
├── recommendationService.test.ts
├── routeBuilderService.test.ts
└── aestheticProfileProcessor.test.ts
```

**Test coverage**:

1. **Algorithm Tests**:
   - [ ] Decay calculation (weekly multiplier correct)
   - [ ] Normalization sums to exactly 100
   - [ ] Confidence formula (10-95 range)
   - [ ] Cold start noise (±5%)
   - [ ] Event processing (profile updates correctly)

2. **Recommendation Tests**:
   - [ ] Cosine similarity (0-1 range)
   - [ ] Alignment score calculation
   - [ ] Novelty by year built
   - [ ] Segmentation percentages (60/35/5)
   - [ ] Reason generation logic
   - [ ] Null building profile handling

3. **Route Builder Tests**:
   - [ ] Time constraint respected (70-85% buffer)
   - [ ] Greedy selection algorithm
   - [ ] Tier detection thresholds
   - [ ] Behavioral similarity calculation
   - [ ] Wildcard mode trigger
   - [ ] Minimum buildings requirement

**Target**: 80%+ coverage on core services

#### 9.2 Integration Testing

**Manual test scenarios**:

1. **End-to-End Flow**:
   ```
   New User
     → Complete Quiz
     → See Results Screen (animated)
     → Home orb updates color
     → Scan Building
     → Profile shifts slightly
     → Start Walk
     → See recommendations
     → Complete Walk
     → XP awarded with multipliers
   ```

2. **Profile Evolution**:
   - Day 1: Complete quiz → verify initial profile
   - Day 2: Scan 5 same-style buildings → profile shifts
   - Day 3: Like romantic buildings → confidence increases
   - Day 7: Check decay applied (5% reduction)
   - Day 14: Scan different style → profile rebalances

3. **Recommendation Accuracy**:
   - Classicist profile → classical buildings prioritized
   - Modernist profile → modernist buildings prioritized
   - Mixed profile → balanced recommendations
   - No profile → default recommendations work

4. **Edge Cases**:
   - [ ] No quiz completed (cold start behavior)
   - [ ] Only negative events (unlikes)
   - [ ] Offline mode (events queue, sync on reconnect)
   - [ ] Buildings missing aesthetic_profile (graceful skip)
   - [ ] Very sparse area (few buildings within time budget)
   - [ ] Very dense area (many buildings, smart selection)
   - [ ] Network failure (retry logic, error handling)
   - [ ] Mid-quiz quit (resume functionality)

#### 9.3 Performance Testing

**Metrics to establish**:

1. **Event Processing**:
   - [ ] 10 events: < 500ms
   - [ ] 100 events: < 2s
   - [ ] App launch time impact: < 100ms

2. **Recommendation Generation**:
   - [ ] Score 50 buildings: < 500ms
   - [ ] Score 200 buildings: < 1.5s
   - [ ] Memory usage: < 50MB

3. **Route Building**:
   - [ ] Build route from 50 buildings: < 1s
   - [ ] Build route from 200 buildings: < 2s

**Optimization targets**:
- Event processing: < 500ms for 10 events
- Recommendation scoring: < 1s for 100 buildings
- Profile fetch: < 200ms

---

### Phase 10: Monitoring & Analytics 📊

**Status**: Not started
**Timeline**: 2 weeks
**Objectives**: Production observability, A/B test infrastructure, drift detection

#### 10.1 Logging Infrastructure

**File**: `src/lib/log.ts` (MODIFY - add structured events)

**Events to log**:

```typescript
// Profile events
log.info('[aesthetic] Profile updated', {
  userId,
  eventsProcessed: number,
  topArchetype: string,
  confidence: number,
  actionCounts: Record<string, number>
});

// Recommendation events
log.info('[recommendations] Buildings scored', {
  userId,
  buildingCount: number,
  avgAlignmentScore: number,
  tier: 'aesthetic' | 'behavioral' | 'wildcard'
});

// Walk events
log.info('[walk] Route generated', {
  userId,
  buildingCount: number,
  estimatedDuration: number,
  routeTier: string,
  xpMultiplier: number
});
```

#### 10.2 Analytics Events

**To implement**:

1. **Quiz Completion**:
   - [ ] Track start/completion rate
   - [ ] Track time to complete
   - [ ] Track accuracy distribution

2. **Profile Evolution**:
   - [ ] Archetype shifts over time
   - [ ] Confidence score growth trajectory
   - [ ] Event frequency by type
   - [ ] Decay impact measurements

3. **Recommendations**:
   - [ ] Acceptance rate (buildings visited / recommended)
   - [ ] Tier distribution (aesthetic vs behavioral vs wildcard)
   - [ ] CTR by recommendation tier
   - [ ] Alignment score distribution

4. **Walks**:
   - [ ] Completion rate
   - [ ] Average duration (expected vs actual)
   - [ ] Buildings visited per walk
   - [ ] Route tier breakdown

#### 10.3 A/B Testing Infrastructure

**Setup** (for future experiments):

1. **Experiment Framework**:
   - Control: Baseline recommendations (current algorithm)
   - Variant A: Test recommendation weights (55/30/15 vs 60/25/10)
   - Variant B: Test wildcard percentage (10% vs 5%)
   - Variant C: Test time buffer (65/85 vs 70/85)

2. **Metrics to Track**:
   - Walk completion rate
   - Average walk duration
   - Buildings visited (vs recommended)
   - User retention
   - XP earned per user

3. **Minimum Sample Size**:
   - 1000 users per variant
   - 2-week experiment window
   - Statistical significance: p < 0.05

**Note**: A/B testing deferred to after Phase 8 validation (as per original feedback: "This is critical for a recommendation system").

#### 10.4 Error Monitoring

**Alerts to configure**:

1. **Profile Processing**:
   - Error rate > 5% → page alert
   - Event queue not flushing > 24h → warning

2. **Recommendations**:
   - Recommendation generation > 2s → warning
   - Building profile fetch failure rate > 10% → page alert

3. **Route Building**:
   - Route generation failure > 2% → page alert
   - No buildings found in time budget > 5% → monitor

---

## System Architecture

### Data Flow

```
USER ACTIONS
├── Quiz completion
├── Building scan
├── Like/save
└── Walk completion
        ↓
EVENT CREATION (aestheticEventGateway)
├── Calculate weight
├── Fetch building profile
└── Immediate or batch
        ↓
EVENT QUEUE (AsyncStorage + Supabase)
├── Store locally
└── Sync when:
    ├── Queue ≥ 10 events
    ├── App foreground
    └── High-priority event
        ↓
CLIENT-SIDE PROCESSING (aestheticProfileProcessor)
├── Load profile + events
├── Apply decay (5% weekly)
├── Process each event
├── Normalize scores
├── Calculate confidence
└── Update Supabase
        ↓
PROFILE STORAGE
├── raw_scores
├── normalized_scores
├── confidence
└── action_counts
        ↓
RECOMMENDATIONS (recommendationService)
├── Score buildings
├── Segment tiers
└── Provide reasons
        ↓
ROUTE BUILDING (routeBuilderService) [Phase 8]
├── Filter by alignment
├── Behavioral fallback
├── Greedy time selection
└── Optimize order
        ↓
UI DISPLAY
├── QuizResultsScreen
├── HomeView (orb)
├── WalkStartScreen
└── WalkNavScreen
```

### Database Schema

**user_aesthetic_profiles**:
- `user_id` (PK)
- `raw_scores` JSONB
- `normalized_scores` JSONB
- `confidence` numeric (10-95)
- `action_counts` JSONB
- `last_decay_timestamp`
- `total_events_processed`

**user_aesthetic_events**:
- `event_uuid` (PK)
- `user_id` (FK)
- `event_type` (quiz_answer, building_scan, etc.)
- `building_bin` (optional)
- `building_aesthetic_profile` JSONB
- `payload` JSONB
- `base_weight` numeric
- `processed` boolean

**buildings_full_merge_scanning** (existing):
- `bin` (PK)
- `aesthetic_profile` JSONB
- `significance_score` int
- `architectural_style` text
- `year_built` int
- `architect` text

---

## Key Feedback Integration

### Original Feedback → Implementation

| Feedback | Status | Solution |
|----------|--------|----------|
| Decay too complex | ✅ Fixed | 5% weekly flat decay |
| Confidence over-engineered | ✅ Fixed | Simple `min(95, 10 + actions * 2)` |
| 60/5 split unclear | ✅ Fixed | Explicit 60/35/5 segmentation |
| Quiz→Results UX gap | ✅ Fixed | Error handling + retake + resume |
| Building profile nulls | ✅ Fixed | Graceful return 0 |
| No A/B testing infra | 🔄 Phase 10 | Analytics framework planned |
| Stylist underrep. | ⏳ External | Quiz questions need update |
| Server reconciliation overkill | ✅ Deferred | Client-side sufficient |
| Cold start problem | ✅ Fixed | ±5% randomization added |
| Cron 3x/day excessive | ✅ Removed | Client-side only |

### Architectural Decisions Made

**Why Simplified Decay**:
- Original: Complex logarithmic with importance weighting
- User feedback: "Consider starting simpler and adding complexity based on real usage data"
- Decision: 5% weekly flat decay
- Rationale: Sufficient for MVP, easy to tune, matches user expectations

**Why Simple Confidence**:
- Original: Multi-component formula with diversity/visual/consistency bonuses
- User feedback: "These magic numbers will need extensive tuning"
- Decision: `min(95, 10 + (totalActions * 2))`
- Rationale: Linear, predictable, easy to understand

**Why Client-Side Only (No Edge Function)**:
- Original: Cron 3x/day server reconciliation
- User feedback: "This is overkill when decay formula uses weekly intervals"
- Decision: Skip server reconciliation in V1
- Rationale: Adds deployment complexity, client-side sufficient, can add later

**Why Time-Constrained Routes**:
- User request: "Routes respect user's time selection"
- Decision: 70-85% buffer (comfortable, achievable)
- Rationale: Users don't want 45-min routes when they select 10 min

**Why Wildcard 2.5x XP**:
- User request: "Reward exploration with bonus XP"
- Decision: 2.5x multiplier for low-aesthetic-match walks
- Rationale: Strong incentive to discover new styles, balances filter bubble risk

---

## Critical Files Reference

### Core Services (7 files)

1. **`src/config/aestheticAlgorithm.ts`** ✅
   - Constants, archetypes, weights, formulas

2. **`src/services/aestheticAlgorithmService.ts`** ✅
   - Decay, normalization, confidence functions

3. **`src/services/gateways/aestheticEventGateway.ts`** ✅
   - Event creation, queuing, batching

4. **`src/services/aestheticProfileProcessor.ts`** ✅
   - Client-side event processing

5. **`src/services/recommendationService.ts`** ✅
   - Building scoring (60/25/10/5 weights)

6. **`src/features/aesthetic/useAestheticProfile.ts`** ✅
   - React hook for profile state

7. **`src/services/routeBuilderService.ts`** 🔄 Phase 8
   - Time-aware route building

### Integration Points (8 files)

8. **`src/screens/Quiz/QuizResultsScreen.tsx`** ✅
   - Post-quiz results display

9. **`src/screens/Quiz/OnboardingQuizScreen.js`** ✅
   - Navigate to results screen

10. **`src/screens/Scan/ScanScreen.js`** ✅
    - Building scan event tracking

11. **`src/screens/Scan/BuildingInfoScreen.tsx`** ✅
    - Like/save event tracking

12. **`src/features/walks/mutations.ts`** ✅ (Phase 8: add wildcard multiplier)
    - Walk completion event tracking

13. **`src/screens/Walk/WalkStartScreen.js`** ✅ (Phase 8: integrate route builder)
    - Building scoring and filtering

14. **`src/screens/Walk/WalkNavScreen.js`** 🔄 Phase 8
    - Route tier badges

15. **`App.tsx`** ✅
    - Foreground event flushing

### Database Migrations (2 files)

16. **`supabase/migrations/20251130_create_aesthetic_events.sql`** ✅
17. **`supabase/migrations/20251130_enhance_aesthetic_profiles.sql`** ✅

---

## Implementation Timeline

### Completed ✅

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| 1 | Database | 2 days | ✅ Complete |
| 2 | Algorithm | 3 days | ✅ Complete |
| 3 | Events | 2 days | ✅ Complete |
| 4 | Processing | 2 days | ✅ Complete |
| 5 | UI | 1 day | ✅ Complete |
| 6 | Recommendations | 2 days | ✅ Complete |
| 7 | Orb/Glow | 3 days | ✅ Complete |
| **Total** | **Phases 1-7** | **~2 weeks** | **✅ DONE** |

### In Progress 🔄

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| 8 | Route Optimization | 3 weeks | 🔄 Planned (approved) |

### Remaining 📋

| Phase | Scope | Duration | Status |
|-------|-------|----------|--------|
| 9 | Testing | 3 weeks | 📋 Not started |
| 10 | Monitoring | 2 weeks | 📋 Not started |
| **Total** | **Phases 8-10** | **~8 weeks** | **📋 Planning** |

### Grand Total

- **Completed**: 2 weeks (Phases 1-7)
- **Remaining**: 8 weeks (Phases 8-10)
- **Full System**: ~10 weeks (2.5 months)

---

## Success Criteria

### Phase 8 (Route Optimization)
- ✅ Routes match time selection (70-85% buffer)
- ✅ Aesthetic tier triggers with >5 aligned buildings
- ✅ Behavioral fallback works with low compatibility
- ✅ Wildcard mode activates correctly (<20% avg score)
- ✅ 2.5x XP bonus applied for exploration walks
- ✅ UI badges display correct tier

### Phase 9 (Testing)
- ✅ 80%+ unit test coverage on core services
- ✅ All edge cases handled gracefully
- ✅ No performance regressions
- ✅ Event processing < 500ms for 10 events
- ✅ Recommendation scoring < 1s for 100 buildings

### Phase 10 (Monitoring)
- ✅ All critical events logged with structure
- ✅ Error monitoring alerts configured
- ✅ Analytics dashboard shows key metrics
- ✅ A/B test infrastructure ready
- ✅ Documentation complete

---

## Next Steps

### Week 1: Phase 8 Core
1. Create `routeBuilderService.ts` with greedy algorithm
2. Create `userBehaviorGateway.ts` for history tracking
3. Write unit tests for selection logic
4. Review and tune threshold values

### Week 2-3: Phase 8 Integration
1. Integrate route builder into WalkStartScreen
2. Add XP multiplier system
3. Update UI with tier badges
4. End-to-end testing (aesthetic → behavioral → wildcard flows)
5. Edge case testing
6. User testing and iteration

### Week 4-6: Phase 9 Testing
1. Expand unit test coverage to 80%+
2. Integration testing (all flows)
3. Performance testing and optimization
4. Load testing with concurrent users

### Week 7-8: Phase 10 Monitoring
1. Implement structured logging
2. Set up analytics events
3. Create A/B testing framework
4. Configure error monitoring alerts
5. Build monitoring dashboard

---

## References

**Original Planning Documents**:
- `/Users/lucienmount/Arch_App_V2/architecture-app/docs/elements/aesthetic_algorithm.md`
- `/Users/lucienmount/Arch_App_V2/architecture-app/docs/elements/integration.md`

**Approved Plan**:
- `/Users/lucienmount/.claude/plans/glimmering-painting-blossom.md` (Phase 8 detailed)

**Implemented Services**:
- All files referenced in "Critical Files Reference" section above

---

## Questions & Support

For questions about:
- **Phases 1-7**: Review implemented files in `src/services/` and `src/screens/`
- **Phase 8**: See detailed plan in `glimmering-painting-blossom.md`
- **Phases 9-10**: Reference sections above
- **Original spec**: Check `docs/elements/` files for algorithmic details

---

**Document Version**: 2.0
**Last Updated**: November 30, 2025
**Status**: Ready for Phase 8 implementation
