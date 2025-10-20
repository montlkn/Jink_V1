/**
 * Rate limiting and circuit breaker for AI generation endpoints
 */

import { AI_CONFIG } from '../config/aiConfig.js';
import Redis from 'ioredis';

let redisClient = null;
let redisUnavailableLogged = false;
let redisDisabled = false;

function getRedis() {
  if (AI_CONFIG.rateLimit.disabled || redisDisabled) return null;
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (!redisUnavailableLogged) {
      console.warn('[rate-limit] REDIS_URL not set, disabling Redis-backed limits');
      redisUnavailableLogged = true;
    }
    redisDisabled = true;
    return null;
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  });
  // Connect on first use
  redisClient.connect().catch(error => {
    if (!redisUnavailableLogged) {
      console.warn('[rate-limit] Redis connect failed, limits disabled:', error.message);
      redisUnavailableLogged = true;
    }
    redisClient?.disconnect();
    redisClient = null;
    redisDisabled = true;
  });
  redisClient.on('error', error => {
    if (!redisUnavailableLogged) {
      console.warn('[rate-limit] Redis error, failing open:', error.message);
      redisUnavailableLogged = true;
    }
    redisClient?.disconnect();
    redisClient = null;
    redisDisabled = true;
  });
  return redisClient;
}

/**
 * Per-user rate limiter (token bucket algorithm)
 */
export async function checkUserRateLimit(userId) {
  const key = `rl:user:${userId}`;
  const burst = AI_CONFIG.rateLimit.perUserBurst;
  const refillMinutes = AI_CONFIG.rateLimit.perUserRefillMinutes;
  const dailyMax = AI_CONFIG.rateLimit.perUserDailyMax;

  try {
    // Optional: disable rate limiting (useful for dev/testing)
    if (AI_CONFIG.rateLimit.disabled) {
      return { allowed: true, tokensRemaining: burst, dailyRemaining: dailyMax };
    }
    const redis = getRedis();
    if (!redis) {
      return { allowed: true };
    }
    // Get current tokens and last refill time
    const data = await redis.get(key);
    const now = Date.now();

    let tokens = burst;
    let lastRefill = now;
    let dailyCount = 0;

    if (data) {
      const parsed = JSON.parse(data);
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;
      dailyCount = parsed.dailyCount;

      // Check if we should refill
      const minutesElapsed = (now - lastRefill) / 60000;
      const refillAmount = Math.floor(minutesElapsed / refillMinutes);

      if (refillAmount > 0) {
        tokens = Math.min(burst, tokens + refillAmount);
        lastRefill = now;
      }
    }

    // Check daily cap
    const dayKey = `rl:daily:${userId}:${new Date().toDateString()}`;
    const dayData = await redis.get(dayKey);
    dailyCount = dayData ? parseInt(dayData) : 0;

    if (dailyCount >= dailyMax) {
      return {
        allowed: false,
        reason: 'daily_cap_exceeded',
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    // Check token bucket
    if (tokens >= 1) {
      tokens -= 1;
      dailyCount += 1;

      // Update Redis with new state
      const expireSeconds = Math.max(60, refillMinutes * 60); // seconds
      await redis.setex(key, expireSeconds, JSON.stringify({ tokens, lastRefill, dailyCount }));

      await redis.incr(dayKey);
      await redis.expire(dayKey, 24 * 60 * 60);

      return {
        allowed: true,
        tokensRemaining: tokens,
        dailyRemaining: dailyMax - dailyCount,
      };
    } else {
      // Calculate when next token available
      const nextTokenTime = lastRefill + refillMinutes * 60000;
      const waitMs = Math.max(0, nextTokenTime - now);

      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        retryAfterMs: waitMs,
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      };
    }
  } catch (error) {
    console.error('[rate-limit] Error:', error.message);
    // Fail open on Redis error
    return { allowed: true };
  }
}

/**
 * Circuit breaker for AI API failures
 */
export async function checkCircuitBreaker() {
  const key = 'cb:ai:state';
  const windowKey = 'cb:ai:window';

  try {
    // Optional: disable breaker fully (useful for early testing)
    if (AI_CONFIG.circuitBreaker.disabled) {
      return { state: 'disabled', failureRate: 0, canAttempt: true };
    }
    const redis = getRedis();
    if (!redis) {
      return { state: 'disabled', failureRate: 0, canAttempt: true };
    }
    const state = await redis.get(key);
    const windowData = await redis.get(windowKey);

    const now = Date.now();
    let breaker = state ? JSON.parse(state) : { state: 'closed', openedAt: null };
    let window = windowData ? JSON.parse(windowData) : { failures: 0, successes: 0, startTime: now };

    // Check if we should try to reset
    if (breaker.state === 'open' && breaker.openedAt) {
      const openedMs = now - breaker.openedAt;
      const resetTimeoutMs = Math.min(
        AI_CONFIG.circuitBreaker.resetTimeoutMs * Math.pow(2, breaker.attempts || 0),
        AI_CONFIG.circuitBreaker.maxResetTimeoutMs
      );

      if (openedMs > resetTimeoutMs) {
        console.log('[breaker] Attempting reset');
        breaker.state = 'half-open';
        breaker.attempts = (breaker.attempts || 0) + 1;
      }
    }

    // Check if window should reset (5 minute window)
    if (now - window.startTime > 5 * 60 * 1000) {
      window = { failures: 0, successes: 0, startTime: now };
    }

    return {
      state: breaker.state,
      failureRate: window.successes + window.failures > 0
        ? window.failures / (window.successes + window.failures)
        : 0,
      canAttempt: breaker.state === 'closed' || breaker.state === 'half-open',
    };
  } catch (error) {
    console.error('[breaker] Error:', error.message);
    return { state: 'unknown', canAttempt: true };
  }
}

/**
 * Record a generation attempt result
 */
export async function recordGenerationAttempt(success) {
  const windowKey = 'cb:ai:window';
  const key = 'cb:ai:state';

  try {
    const redis = getRedis();
    if (!redis) return;
    const windowData = await redis.get(windowKey);
    const now = Date.now();

    let window = windowData ? JSON.parse(windowData) : { failures: 0, successes: 0, startTime: now };

    // Reset window if expired
    if (now - window.startTime > 5 * 60 * 1000) {
      window = { failures: 0, successes: 0, startTime: now };
    }

    // Update counts
    if (success) {
      window.successes += 1;
    } else {
      window.failures += 1;
    }

    // Check if we should trip breaker
    const total = window.successes + window.failures;
    if (total >= AI_CONFIG.circuitBreaker.windowSize) {
      const failureRate = window.failures / total;

      if (failureRate > AI_CONFIG.circuitBreaker.failureThresholdPct / 100) {
        console.warn(`[breaker] Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold, opening`);

        const breaker = {
          state: 'open',
          openedAt: now,
          attempts: 0,
        };

        await redis.setex(key, 30 * 60, JSON.stringify(breaker)); // Hold for 30 min
      }
    }

    await redis.setex(windowKey, 5 * 60, JSON.stringify(window));
  } catch (error) {
    console.error('[record-attempt] Error:', error.message);
  }
}

/**
 * Get current breaker and rate limit status
 *
 * IMPORTANT: This returns the state, not a decision.
 * Caller decides what to do:
 * - Rate limit exceeded → return 429
 * - Breaker open → return 200 with cached + needsUpdate=true (NOT 503)
 */
export async function getHealthStatus(userId) {
  const breaker = await checkCircuitBreaker();
  const rateLimit = await checkUserRateLimit(userId);

  return {
    breaker,
    rateLimit,
    canAttemptGeneration: breaker.canAttempt && rateLimit.allowed,
  };
}
