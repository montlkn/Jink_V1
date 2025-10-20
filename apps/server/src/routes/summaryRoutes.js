/**
 * API routes for profile summary endpoints
 * Deploy as Supabase Edge Functions or Express routes
 */

import {
  getSummaryService,
  regenerateSummaryService,
  getSummaryMetaService,
} from '../summary/service.js';

/**
 * GET /api/profile/summary?autogen=true
 * Fetch current summary, optionally queue regeneration
 *
 * CRITICAL: autogen=true is REQUIRED to trigger generation.
 * Without it, only cached summaries are returned. This guards against
 * crawler storms and ensures intentional API calls trigger model work.
 */
export async function handleGetSummary(req, res) {
  const result = await getSummaryService({
    authorization: req.headers.authorization,
    autogen: req.query.autogen === 'true',
  });
  return res.status(result.status).json(result.body);
}

/**
 * POST /api/profile/summary/regenerate
 * Manually trigger regeneration (requires Idempotency-Key for deduplication)
 *
 * The Idempotency-Key is used as the jobId to prevent duplicate enqueuing.
 * Multiple requests with the same key within the cooldown period return immediately.
 */
export async function handleRegenerateSummary(req, res) {
  const result = await regenerateSummaryService({
    authorization: req.headers.authorization,
    idempotencyKey: req.headers['idempotency-key'],
  });
  return res.status(result.status).json(result.body);
}

/**
 * GET /api/profile/summary/meta
 * Read-only metadata endpoint
 */
export async function handleGetSummaryMeta(req, res) {
  const result = await getSummaryMetaService({
    authorization: req.headers.authorization,
  });
  return res.status(result.status).json(result.body);
}

/**
 * Middleware to apply to summary routes
 */
export function applySummaryMiddleware(app) {
  app.get('/api/profile/summary', handleGetSummary);
  app.post('/api/profile/summary/regenerate', handleRegenerateSummary);
  app.get('/api/profile/summary/meta', handleGetSummaryMeta);
}
