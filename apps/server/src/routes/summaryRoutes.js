/**
 * API routes for profile summary endpoints
 * Deploy as Supabase Edge Functions or Express routes
 */

import { supabase } from '../supabaseClient.js';
import { fetchProfileSummary, getProfileMetadata } from '../summary/generate.js';
import { enqueueSummaryGeneration, isJobInFlight } from '../workers/summaryWorker.js';
import {
  checkUserRateLimit,
  checkCircuitBreaker,
  recordGenerationAttempt,
  getHealthStatus,
} from '../middleware/rateLimitBreaker.js';
import { checkDivergence } from '../utils/divergence.js';

/**
 * GET /api/profile/summary?autogen=true
 * Fetch current summary, optionally queue regeneration
 *
 * CRITICAL: autogen=true is REQUIRED to trigger generation.
 * Without it, only cached summaries are returned. This guards against
 * crawler storms and ensures intentional API calls trigger model work.
 */
export async function handleGetSummary(req, res) {
  try {
    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = user.id;
    const autogen = req.query.autogen === 'true'; // MUST be exact string match

    // Fetch current summary (always returns cached if it exists)
    const summary = await fetchProfileSummary(userId);

    // If autogen requested AND summary missing/needs update, queue generation
    if (autogen) {
      if (!summary || summary.needs_update) {
        // Check rate limits ONLY if autogen
        const rateCheck = await checkUserRateLimit(userId);
        if (!rateCheck.allowed) {
          return res.status(429).json({
            error: rateCheck.reason,
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          });
        }

        // Check circuit breaker ONLY if autogen
        const breakerCheck = await checkCircuitBreaker();
        if (!breakerCheck.canAttempt) {
          // Breaker open: don't even try, just return cached + needsUpdate
          return res.status(200).json({
            summary: summary
              ? {
                  text: summary.text,
                  keyPhrases: summary.key_phrases,
                  generatedAt: summary.generated_at,
                  version: summary.version,
                }
              : null,
            meta: {
              version: summary?.version || 0,
              needsUpdate: true, // Mark for client retry
              sourceModel: summary?.source_model || null,
              breakerOpen: true,
            },
          });
        }

        // Check if job already in flight to avoid duplicate queueing
        const inFlight = await isJobInFlight(userId);
        if (!inFlight) {
          // Queue regeneration
          await enqueueSummaryGeneration(userId, { priority: 10 });
        }
      }
    }
    // If autogen NOT requested, return cached only (no generation work)

    return res.status(200).json({
      summary: summary
        ? {
            text: summary.text,
            keyPhrases: summary.key_phrases,
            generatedAt: summary.generated_at,
            version: summary.version,
          }
        : null,
      meta: {
        version: summary?.version || 0,
        needsUpdate: summary?.needs_update || false,
        sourceModel: summary?.source_model || null,
      },
    });
  } catch (error) {
    console.error('[api-get-summary] Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/profile/summary/regenerate
 * Manually trigger regeneration (requires Idempotency-Key for deduplication)
 *
 * The Idempotency-Key is used as the jobId to prevent duplicate enqueuing.
 * Multiple requests with the same key within the cooldown period return immediately.
 */
export async function handleRegenerateSummary(req, res) {
  try {
    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // CRITICAL: Require Idempotency-Key for deduplication
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      return res.status(400).json({
        error: 'Idempotency-Key header required and non-empty',
        example: 'Idempotency-Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      });
    }

    const userId = user.id;

    // Check health (rate limits + circuit breaker)
    const health = await getHealthStatus(userId);
    if (!health.healthy) {
      const statusCode = health.rateLimit.allowed ? 503 : 429;
      const errorMsg = health.rateLimit.reason || 'Service temporarily unavailable';
      return res.status(statusCode).json({
        error: errorMsg,
        retryAfterSeconds: health.rateLimit.retryAfterSeconds,
      });
    }

    // Queue regeneration, using idempotencyKey as jobId to prevent duplicates
    // If a job with this ID already exists, BullMQ will not create a new one
    const job = await enqueueSummaryGeneration(userId, {
      idempotencyKey, // Passed to worker for logging
      jobIdOverride: idempotencyKey, // Use as the actual job ID
    });

    return res.status(202).json({
      message: 'Regeneration queued',
      jobId: job.id,
      idempotencyKey,
    });
  } catch (error) {
    console.error('[api-regenerate] Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/profile/summary/meta
 * Read-only metadata endpoint
 */
export async function handleGetSummaryMeta(req, res) {
  try {
    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = user.id;

    // Fetch metadata
    const meta = await getProfileMetadata(userId);

    if (!meta) {
      return res.status(404).json({ error: 'No summary found' });
    }

    return res.status(200).json(meta);
  } catch (error) {
    console.error('[api-meta] Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to apply to summary routes
 */
export function applySummaryMiddleware(app) {
  app.get('/api/profile/summary', handleGetSummary);
  app.post('/api/profile/summary/regenerate', handleRegenerateSummary);
  app.get('/api/profile/summary/meta', handleGetSummaryMeta);
}
