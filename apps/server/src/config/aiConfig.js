/**
 * AI Configuration: Two-tier model strategy with fallback logic
 */

export const AI_CONFIG = {
  enabled: process.env.AI_GENERATION_ENABLED !== 'false',
  apiKey: process.env.GEMINI_API_KEY,

  // Two-tier model strategy
  models: {
    primary: {
      name: process.env.AI_PRIMARY_MODEL || 'gemini-2.0-flash-lite',
      maxTokens: 256,
      temperature: 0.7,
      topP: 0.9,
      description: 'Fast/lite model for standard generation',
    },
    fallback: {
      name: process.env.AI_FALLBACK_MODEL || 'gemini-2.0-flash',
      maxTokens: 384,
      temperature: 0.5, // Lower temp for more consistent reasoning
      topP: 0.8,
      description: 'Reasoning model for safety-blocked or failed generations',
    },
  },

  // Escalation rules
  escalationRules: {
    retryOnInvalidJson: 1, // Retry once on bad JSON before escalating
    escalateOnFailureKinds: [
      'invalid_json',
      'too_long',
      'safety_blocked',
      'pii_detected',
    ],
    maxAttemptsPerTier: 1, // 1 attempt per tier
  },

  // Rate limiting
  rateLimit: {
    // Allow overrides via env for dev/test
    perUserBurst: Number.parseInt(process.env.AI_RATE_LIMIT_BURST || '1', 10),
    perUserRefillMinutes: Number.parseInt(
      process.env.AI_RATE_LIMIT_PER_USER_MINUTES || '10',
      10
    ),
    perUserDailyMax: Number.parseInt(
      process.env.AI_RATE_LIMIT_DAILY_CAP || '5',
      10
    ),
    disabled: String(process.env.AI_RATE_LIMIT_DISABLE || '').toLowerCase() === 'true',
  },

  // Circuit breaker settings
  circuitBreaker: {
    failureThresholdPct: 15, // Open when 5xx > 15% of last 200 calls
    windowSize: 200, // Track last 200 calls
    resetTimeoutMs: 5000, // Start at 5 seconds
    maxResetTimeoutMs: 900000, // Max 15 minutes
    disabled: String(process.env.AI_CIRCUIT_BREAKER_DISABLE || '').toLowerCase() === 'true',
  },

  // Output constraints
  output: {
    maxWords: 100,
    keyPhraseCount: { min: 3, max: 7 },
  },

  // Safety checks
  safety: {
    stripPII: true,
    allowedContextFields: [
      'aestheticBreakdown',
      'primaryArchetype',
      'secondaryArchetype',
      'totalPosts',
      'joinedDaysAgo',
      'topCategories',
    ],
  },
};

/**
 * Get the appropriate model config based on context
 */
export function selectModel(shouldEscalate = false) {
  if (shouldEscalate) {
    return AI_CONFIG.models.fallback;
  }
  return AI_CONFIG.models.primary;
}

/**
 * Validate AI_CONFIG on startup
 */
export function validateAIConfig() {
  if (!AI_CONFIG.enabled) {
    console.warn('AI generation is disabled');
    return true;
  }

  if (!AI_CONFIG.apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }

  return true;
}
