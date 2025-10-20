/**
 * Shared service logic for profile summary endpoints.
 * Allows reuse across Express routes and Modal adapters.
 */

import { supabase } from '../supabaseClient.js';
import { fetchProfileSummary, generateAndPersistSummary, getProfileMetadata } from './generate.js';
import {
  checkUserRateLimit,
  checkCircuitBreaker,
  getHealthStatus,
} from '../middleware/rateLimitBreaker.js';
import { checkDivergence } from '../utils/divergence.js';
import { AI_CONFIG } from '../config/aiConfig.js';

async function authenticateUser(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Unauthorized' },
    };
  }

  const token = authorizationHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      ok: false,
      status: 401,
      body: { error: 'Invalid token' },
    };
  }

  return { ok: true, user };
}

function formatSummary(summary) {
  if (!summary) return null;
  return {
    text: summary.text,
    keyPhrases: summary.key_phrases,
    generatedAt: summary.generated_at,
    version: summary.version,
    sourceModel: summary.source_model || null,
    needsUpdate: summary.needs_update || false,
  };
}

async function fetchAestheticProfile(userId) {
  try {
    const { data, error } = await supabase.rpc('get_user_aesthetic_profile', {
      p_user_id: userId,
    });
    if (error) {
      console.warn('[service-get-summary] Profile RPC error', userId, error.message);
      return null;
    }
    const profile = Array.isArray(data) ? data[0] : null;
    if (!profile) {
      console.warn('[service-get-summary] Profile RPC returned empty result', userId);
    }
    return profile;
  } catch (error) {
    console.error('[service-get-summary] Profile RPC thrown error', userId, error.message);
    return null;
  }
}

export async function getSummaryService({ authorization, autogen = false }) {
  try {
    const authResult = await authenticateUser(authorization);
    if (!authResult.ok) {
      return {
        status: authResult.status,
        body: authResult.body,
      };
    }

    const userId = authResult.user.id;
    let summary = await fetchProfileSummary(userId);
    let generationError = null;
    let generationAttempted = false;
    let generationSuccess = false;

    if (autogen) {
      const rateCheck = await checkUserRateLimit(userId);
      if (!rateCheck.allowed) {
        return {
          status: 429,
          body: {
            error: rateCheck.reason,
            retryAfterSeconds: rateCheck.retryAfterSeconds,
          },
        };
      }

      const breakerCheck = await checkCircuitBreaker();
      if (!breakerCheck.canAttempt) {
        const formatted = formatSummary(summary);
        return {
          status: 200,
          body: {
            summary: formatted
              ? {
                  text: formatted.text,
                  keyPhrases: formatted.keyPhrases,
                  generatedAt: formatted.generatedAt,
                  version: formatted.version,
                }
              : null,
            meta: {
              version: formatted?.version || 0,
              needsUpdate: true,
              sourceModel: formatted?.sourceModel || null,
              breakerOpen: true,
            },
          },
        };
      }

      let shouldGenerate = !summary;
      if (!shouldGenerate) {
        const profileForCheck = await fetchAestheticProfile(userId);

        if (profileForCheck) {
          const div = checkDivergence(
            profileForCheck.archetype_scores || {},
            summary.baseline_breakdown || {}
          );
          shouldGenerate = div.shouldRegenerate || summary.needs_update === true;
        } else {
          shouldGenerate = false;
        }
      }

      if (shouldGenerate && AI_CONFIG.enabled) {
        const profile = await fetchAestheticProfile(userId);

        if (profile) {
          generationAttempted = true;
          const generationResult = await generateAndPersistSummary(userId, {
            ...profile,
            joined_days_ago: Math.floor(
              (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
            ),
          });
          if (generationResult?.success && generationResult.summary) {
            console.log('[service-get-summary] Generation succeeded for', userId);
            summary = generationResult.summary;
            generationSuccess = true;
          } else {
            console.warn(
              '[service-get-summary] Generation returned no summary',
              userId,
              generationResult?.error
            );
            generationError = generationResult?.error || 'Unknown generation failure';
            // Fallback: refetch in case the upsert succeeded but no summary returned
            summary = await fetchProfileSummary(userId);
            generationSuccess = !!summary;
          }
        }
      }
    }

    if (!summary) {
      // Final attempt to read from Supabase (e.g., if autogen just seeded it)
      summary = await fetchProfileSummary(userId);
    }

    const formatted = formatSummary(summary);

    return {
      status: 200,
      body: {
        summary: formatted
          ? {
              text: formatted.text,
              keyPhrases: formatted.keyPhrases,
              generatedAt: formatted.generatedAt,
              version: formatted.version,
            }
          : null,
        meta: {
          version: formatted?.version || 0,
          needsUpdate: formatted?.needsUpdate || false,
          sourceModel: formatted?.sourceModel || null,
          generationError,
          generationAttempted,
          generationSuccess,
        },
      },
    };
  } catch (error) {
    console.error('[service-get-summary] Error:', error.message);
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}

export async function regenerateSummaryService({ authorization, idempotencyKey }) {
  try {
    const authResult = await authenticateUser(authorization);
    if (!authResult.ok) {
      return {
        status: authResult.status,
        body: authResult.body,
      };
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      return {
        status: 400,
        body: {
          error: 'Idempotency-Key header required and non-empty',
          example: 'Idempotency-Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        },
      };
    }

    const userId = authResult.user.id;
    const health = await getHealthStatus(userId);
    if (!health.canAttemptGeneration) {
      const statusCode = health.rateLimit?.allowed ? 503 : 429;
      const errorMsg = health.rateLimit?.reason || 'Service temporarily unavailable';
      return {
        status: statusCode,
        body: {
          error: errorMsg,
          retryAfterSeconds: health.rateLimit?.retryAfterSeconds,
        },
      };
    }

    const profile = await fetchAestheticProfile(userId);

    if (!profile) {
      return {
        status: 404,
        body: { error: 'Profile not found' },
      };
    }

    const result = await generateAndPersistSummary(userId, {
      ...profile,
      joined_days_ago: Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    });

    if (!result.success) {
      return {
        status: 500,
        body: { error: result.error || 'Generation failed' },
      };
    }

    return {
      status: 200,
      body: { message: 'Regenerated', summary: result.summary, idempotencyKey },
    };
  } catch (error) {
    console.error('[service-regenerate] Error:', error.message);
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}

export async function getSummaryMetaService({ authorization }) {
  try {
    const authResult = await authenticateUser(authorization);
    if (!authResult.ok) {
      return {
        status: authResult.status,
        body: authResult.body,
      };
    }

    const meta = await getProfileMetadata(authResult.user.id);
    if (!meta) {
      return {
        status: 404,
        body: { error: 'No summary found' },
      };
    }

    return {
      status: 200,
      body: meta,
    };
  } catch (error) {
    console.error('[service-meta] Error:', error.message);
    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
}
