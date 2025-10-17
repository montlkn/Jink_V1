#!/usr/bin/env node

import { startSummaryWorker } from '../src/workers/summaryWorker.js';
import { generateAndPersistSummary } from '../src/summary/generate.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  try {
    console.log('[worker] Starting summary generation worker...');

    await startSummaryWorker(async (job) => {
      const { userId } = job.data;
      console.log(`[worker] Processing job for user ${userId}`);

      // Fetch profile from Supabase
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('archetype_scores, primary_archetype, secondary_archetype, created_at, total_posts')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        throw new Error(`Profile not found for user ${userId}`);
      }

      // Enrich with computed fields
      const joinedDaysAgo = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const enrichedProfile = {
        ...profile,
        joined_days_ago: joinedDaysAgo,
      };

      // Generate and persist
      const result = await generateAndPersistSummary(userId, enrichedProfile);

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log(`[worker] Summary generated for user ${userId}`);
      return result.summary;
    });

    console.log('[worker] Worker started successfully');
  } catch (error) {
    console.error('[worker] Fatal error:', error);
    process.exit(1);
  }
})();
