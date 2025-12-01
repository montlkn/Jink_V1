/**
 * Aesthetic Algorithm Configuration
 * Constants and types for the aesthetic profile system
 */

export const ARCHETYPES = [
  'classicist',
  'romantic',
  'stylist',
  'modernist',
  'industrialist',
  'visionary',
  'pop_culturalist',
  'vernacularist',
  'austerist',
] as const;

export type Archetype = typeof ARCHETYPES[number];

/**
 * Base weights for different action types (UPGRADED with full signal hierarchy)
 * Determines how much each action contributes to the profile
 *
 * HIGH SIGNALS: quiz, first-time scans
 * MEDIUM SIGNALS: likes, saves, routes
 * LOW SIGNALS (positive): dwell time, detail views
 * LOW SIGNALS (negative): dismissals, unlikes
 */
export const ACTION_WEIGHTS: Record<string, number> = {
  // HIGH SIGNALS
  quiz_answer: 10,
  'building_scan:first_time': 10,

  // MEDIUM SIGNALS
  'building_scan:repeat': 3,
  building_like: 6,
  building_save: 7,
  route_complete: 5,

  // LOW SIGNALS (positive)
  dwell_time_60s: 5,           // Extended engagement
  'dwell_time_60s+': 5,        // Extended engagement (alt format)
  dwell_time_30s: 3,           // Moderate engagement
  dwell_time_15s: 2,           // Brief engagement
  detail_view: 3,              // Opening building details

  // LOW SIGNALS (negative)
  quick_dismiss: -1,           // Skipped during walk
  building_unlike: -3,         // Explicit negative signal

  // FUTURE (not implemented yet)
  add_note: 6,
  share_building: 4,
  skip_recommendation: -0.5,
};

/**
 * Decay configuration (UPGRADED to logarithmic with importance weighting)
 * decay(days) = max(min_decay, 1 / (1 + alpha * log(days + 1)))
 * effective_decay = decay(days) * importance^importance_exponent
 * This causes older interactions to have less influence, with important archetypes decaying slower
 */
export const DECAY_CONFIG = {
  alpha: 0.5,                    // Aggressiveness of decay
  minDecay: 0.05,                // Minimum decay value (5%)
  importanceExponent: 0.25,      // How much importance affects decay
};

/**
 * Contextual weighting configuration
 * contextual_weight = surprise_factor * (1 + significance/100)
 * Used to boost weight when user encounters unexpected or significant buildings
 */
export const CONTEXTUAL_CONFIG = {
  surpriseLowThreshold: 0.3,       // alignment < 0.3 (very different)
  surpriseHighThreshold: 0.8,      // alignment > 0.8 (very similar)
  surpriseLowMultiplier: 1.8,      // Boost for very different buildings
  surpriseHighMultiplier: 0.7,     // Reduce for very similar buildings
  surpriseNormalMultiplier: 1.0,   // Default for normal alignment
};

/**
 * Recommendation scoring weights
 * Determines how recommendations are ranked
 * Total: 0.6 + 0.25 + 0.1 + 0.05 = 1.0 (100%)
 */
export const REC_WEIGHTS = {
  alignment: 0.6, // 60% - How well building matches user taste
  significance: 0.25, // 25% - Building's historical/architectural significance
  novelty: 0.1, // 10% - How new/unexplored the building is
  surprise: 0.05, // 5% - Bonus for surprising recommendations
};

/**
 * Confidence calculation configuration (UPGRADED to multi-component)
 * confidence = baseConfidence + diversityBonus + consistencyBonus
 * - baseConfidence = min(70, totalActions * 1.5)
 * - diversityBonus = actionDiversity * 10
 * - consistencyBonus = (1 - entropy/ln(9)) * 15
 */
export const CONFIDENCE_CONFIG = {
  baseMultiplier: 1.5,           // Confidence increase per action
  baseMax: 70,                   // Maximum base confidence
  diversityMultiplier: 10,       // Bonus per distinct action type
  consistencyMax: 15,            // Maximum consistency bonus
  lowerBound: 10,                // Minimum confidence for new users
  upperBound: 95,                // Maximum confidence cap
};

/**
 * Event batching configuration
 * Low-priority events are queued and submitted in batches
 * High-priority events (quiz) process immediately
 */
export const BATCH_THRESHOLDS = {
  minEvents: 10, // Flush queue when this many events accumulated
  maxWaitSeconds: 30, // Flush queue after this many seconds (if min not reached)
  immediateEventTypes: ['quiz_answer'] as const, // Events that bypass batching
};

/**
 * Session configuration & sequence bonuses
 * Used for tracking patterns within user sessions
 * Rewards exploring the same architectural style in depth
 */
export const SESSION_CONFIG = {
  windowMinutes: 90,              // Session window duration
};

/**
 * Sequence bonus configuration
 * Rewards patterns like scanning multiple buildings of the same style
 * +1.5 for 3+ same-style scans, +5.0 for 10+ in a 90-min session
 */
export const SEQUENCE_CONFIG = {
  threeStyleBonus: 1.5,           // Bonus for 3+ same-style scans
  tenStyleBonus: 5.0,             // Bonus for 10+ same-style scans
  sessionWindowMinutes: 90,       // Time window for sequence detection
};

/**
 * API configuration
 */
export const API_CONFIG = {
  BUILDINGS_RADIUS_DEFAULT: 2000, // meters
  RECOMMENDATIONS_LIMIT_DEFAULT: 20,
  WILDCARD_PERCENTAGE: 0.05, // 5% of recommendations are wildcards
  TOP_RESULTS_PERCENTAGE: 0.60, // 60% top-scored
  MEDIUM_RESULTS_PERCENTAGE: 0.35, // 35% medium-scored
};

/**
 * Type definitions for aesthetic events
 */
export interface AestheticEvent {
  event_uuid: string;
  user_id: string;
  event_type: string;
  event_subtype?: string;
  building_bbl?: string;
  building_aesthetic_profile?: Record<Archetype, number>;
  payload: Record<string, any>;
  aesthetic_vector?: Record<Archetype, number>;
  base_weight: number;
  contextual_weight?: number;
  final_weight?: number;
  processed: boolean;
  created_at: string;
  event_timestamp: string;
}

export interface AestheticProfile {
  user_id: string;
  raw_scores: Record<Archetype, number>;
  normalized_scores: Record<Archetype, number>;
  confidence: number;
  action_counts: Record<string, number>;
  last_updated: Date;
  last_decay_timestamp?: Date;
  total_events_processed?: number;
  primary_archetype?: Archetype;
  secondary_archetype?: Archetype;
}
