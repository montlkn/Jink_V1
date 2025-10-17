/**
 * BullMQ worker for profile summary generation
 * Handles async background jobs with retry/fallback logic
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { supabase } from '../supabaseClient.js';
import { generateAndPersistSummary, markNeedsUpdate } from '../summary/generate.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ
});

/**
 * Process a summary generation job
 */
async function processJob(job) {
  const { userId } = job.data;

  console.log(`[worker] Processing summary job for user ${userId} (attempt ${job.attemptsMade + 1})`);

  try {
    // Fetch fresh profile data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        archetype_scores,
        primary_archetype,
        secondary_archetype,
        total_posts,
        created_at,
        top_categories
      `
      )
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    // Calculate joined days
    const joinedDaysAgo = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const enrichedProfile = {
      ...profile,
      joined_days_ago: joinedDaysAgo,
    };

    // Generate and persist summary
    const result = await generateAndPersistSummary(userId, enrichedProfile);

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      userId,
      summary: result.summary,
    };
  } catch (error) {
    console.error(`[worker] Error processing job for user ${userId}:`, error.message);

    // Mark for manual retry on final failure
    if (job.attemptsMade >= job.opts.attempts - 1) {
      console.log(`[worker] Max attempts reached, marking as needs_update`);
      await markNeedsUpdate(userId);
    }

    throw error;
  }
}

/**
 * Initialize and start the worker
 */
export async function startSummaryWorker() {
  const worker = new Worker('profile-summary', processJob, {
    connection: redis,
    concurrency: 3, // Process up to 3 jobs in parallel
    maxStalledCount: 2, // Fail after 2 stalls
    stalledInterval: 5000,
    stalledCount: 0,
    lockDuration: 30000, // 30 second lock
    lockRenewTime: 15000, // Renew every 15 seconds
  });

  worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[worker] Job ${job.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[worker] Worker error:', error.message);
  });

  console.log('[worker] Summary generation worker started');

  return worker;
}

/**
 * Add a job to the queue
 */
export async function enqueueSummaryGeneration(userId, options = {}) {
  try {
    const queue = require('../lib/queue').summaryQueue;

    const job = await queue.add(
      'generate',
      { userId },
      {
        jobId: `summary:user:${userId}`, // Dedupe by user ID
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Remove after 1 hour
        },
        removeOnFail: {
          age: 86400, // Keep failed for 24 hours for debugging
        },
        priority: options.priority || 5,
        // Prevent duplicate jobs per user
        ...(options.idempotencyKey && {
          repeat: {
            every: 3600000, // Won't repeat
          },
        }),
      }
    );

    console.log(`[enqueue] Enqueued job ${job.id} for user ${userId}`);
    return job;
  } catch (error) {
    console.error('[enqueue] Error:', error.message);
    throw error;
  }
}

/**
 * Check if a job is in flight for user
 */
export async function isJobInFlight(userId) {
  try {
    const queue = require('../lib/queue').summaryQueue;
    const job = await queue.getJob(`summary:user:${userId}`);
    return job !== null;
  } catch (error) {
    console.error('[in-flight] Error:', error.message);
    return false;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(userId) {
  try {
    const queue = require('../lib/queue').summaryQueue;
    const job = await queue.getJob(`summary:user:${userId}`);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job._progress;
    const attempts = job.attemptsMade;
    const maxAttempts = job.opts.attempts;

    return {
      userId,
      jobId: job.id,
      state,
      progress,
      attempts,
      maxAttempts,
      createdAt: new Date(job.timestamp),
    };
  } catch (error) {
    console.error('[job-status] Error:', error.message);
    return null;
  }
}
