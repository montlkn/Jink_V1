/**
 * Core summary generation and persistence logic
 */

import { supabase } from '../supabaseClient.js';
import { generateSummary } from '../ai/client.js';
import { hashBreakdown, normalize } from '../utils/normalize.js';

/**
 * Build payload for AI generation
 */
function buildAestheticPayload(profile) {
  return {
    aestheticBreakdown: profile.archetype_scores || {},
    primaryArchetype: profile.primary_archetype,
    secondaryArchetype: profile.secondary_archetype,
    totalPosts: profile.total_posts || 0,
    joinedDaysAgo: profile.joined_days_ago || 0,
    topCategories: profile.top_categories || [],
  };
}

/**
 * Generate and persist a new profile summary
 * Returns { success, summary } or { success: false, error }
 */
export async function generateAndPersistSummary(userId, profile) {
  try {
    console.log(`[summary-persist] Starting generation for user ${userId}`);

    // Build aesthetic data for AI
    const aestheticData = buildAestheticPayload(profile);

    // Call Gemini with two-tier fallback
    const aiResult = await generateSummary(aestheticData);

    if (!aiResult.success) {
      throw new Error('AI generation failed');
    }

    // Compute baseline hash
    const breakdownNormalized = normalize(aestheticData.aestheticBreakdown);
    const baselineHash = await hashBreakdown(aestheticData.aestheticBreakdown);

    // Prepare summary record
    const summaryRecord = {
      user_id: userId,
      version: 1, // Increment on next generation
      text: aiResult.text,
      key_phrases: aiResult.keyPhrases,
      language: 'en',
      tone: 'neutral',
      source_model: aiResult.sourceModel,
      generated_at: aiResult.generatedAt,
      baseline_version: 1,
      baseline_breakdown: breakdownNormalized,
      baseline_hash: baselineHash,
      needs_update: false,
    };

    // Persist to Supabase
    const { data, error } = await supabase
      .from('profile_summaries')
      .upsert([summaryRecord], { onConflict: 'user_id' })
      .select();

    if (error) {
      throw error;
    }

    console.log(`[summary-persist] Success for user ${userId}`);

    // Also store aesthetic snapshot
    await storeAestheticSnapshot(userId, aestheticData.aestheticBreakdown);

    return {
      success: true,
      summary: data?.[0],
    };
  } catch (error) {
    console.error('[summary-persist] Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Store a snapshot of the aesthetic breakdown
 */
async function storeAestheticSnapshot(userId, breakdown) {
  try {
    const normalized = normalize(breakdown);
    const sum = Object.values(breakdown).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);

    await supabase
      .from('aesthetic_snapshots')
      .insert([
        {
          user_id: userId,
          snapshot_at: new Date().toISOString(),
          breakdown: normalized,
          sum_before_normalize: sum,
        },
      ]);
  } catch (error) {
    console.warn('[snapshot] Error storing snapshot:', error.message);
    // Non-critical, don't fail the generation
  }
}

/**
 * Fetch current profile summary
 */
export async function fetchProfileSummary(userId) {
  try {
    const { data, error } = await supabase
      .from('profile_summaries')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('[fetch-summary] Error:', error.message);
    return null;
  }
}

/**
 * Mark summary as needing update without regenerating
 */
export async function markNeedsUpdate(userId) {
  try {
    const { error } = await supabase
      .from('profile_summaries')
      .update({ needs_update: true })
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`[mark-update] Marked user ${userId} for regeneration`);
  } catch (error) {
    console.error('[mark-update] Error:', error.message);
  }
}

/**
 * Get divergence and metadata without generating
 */
export async function getProfileMetadata(userId) {
  try {
    const { data: summary, error } = await supabase
      .from('profile_summaries')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!summary) {
      return null;
    }

    return {
      userId,
      latestVersion: summary.version,
      latestGeneratedAt: summary.generated_at,
      baselineVersion: summary.baseline_version,
      needsUpdate: summary.needs_update || false,
      sourceModel: summary.source_model,
    };
  } catch (error) {
    console.error('[metadata] Error:', error.message);
    return null;
  }
}

/**
 * Initialize empty summary for new user
 */
export async function initializeSummary(userId) {
  try {
    await supabase
      .from('profile_summaries')
      .insert([
        {
          user_id: userId,
          version: 0,
          text: 'Your profile is being analyzed...',
          key_phrases: [],
          language: 'en',
          tone: 'neutral',
          source_model: 'pending',
          generated_at: new Date().toISOString(),
          baseline_version: 0,
          baseline_breakdown: {},
          baseline_hash: '',
          needs_update: true,
        },
      ]);

    console.log(`[init] Initialized summary for user ${userId}`);
  } catch (error) {
    // Ignore conflicts on concurrent inserts
    if (!error.message?.includes('duplicate')) {
      console.error('[init] Error:', error.message);
    }
  }
}
