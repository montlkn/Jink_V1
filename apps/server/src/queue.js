/**
 * BullMQ Queue initialization
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ
});

export const summaryQueue = new Queue('profile-summary', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
    },
    removeOnFail: {
      age: 86400, // 24 hours
    },
  },
});

// Event handlers
summaryQueue.on('error', (error) => {
  console.error('[queue] Error:', error.message);
});

summaryQueue.on('wait', (job) => {
  console.log(`[queue] Job ${job.id} waiting to be processed`);
});

export function closeQueue() {
  return summaryQueue.close();
}
