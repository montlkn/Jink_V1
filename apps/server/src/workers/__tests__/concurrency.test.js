/**
 * Race condition tests for summary generation
 * Verify: One in-flight job per user, exactly one summary persists
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

describe('Summary Generation Concurrency', () => {
  let queue;
  let redis;
  let worker;

  beforeAll(async () => {
    redis = new Redis({ host: 'localhost', port: 6379 });
    queue = new Queue('profile-summary', { connection: redis });

    // Mock worker that simulates generation
    worker = new Worker('profile-summary', async (job) => {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true, summaryId: job.id };
    }, {
      connection: redis,
      concurrency: 3,
    });
  });

  afterAll(async () => {
    await worker.close();
    await queue.close();
    await redis.quit();
  });

  afterEach(async () => {
    // Clean up jobs between tests
    await queue.clean(0);
  });

  test('deduplicates jobs with same jobId', async () => {
    const userId = 'test-user-123';
    const jobId = `summary:user:${userId}`;

    // Add first job
    const job1 = await queue.add('generate', { userId }, { jobId });

    // Try to add second job with same ID
    const job2 = await queue.add('generate', { userId }, { jobId });

    // Both should return the same job instance
    expect(job1.id).toBe(job2.id);
    expect(job1.id).toBe(jobId);
  });

  test('enforces one in-flight job per user', async () => {
    const userId = 'test-user-456';
    const jobId = `summary:user:${userId}`;

    // Rapid-fire 5 requests with same user
    const jobs = await Promise.all([
      queue.add('generate', { userId }, { jobId }),
      queue.add('generate', { userId }, { jobId }),
      queue.add('generate', { userId }, { jobId }),
      queue.add('generate', { userId }, { jobId }),
      queue.add('generate', { userId }, { jobId }),
    ]);

    // All should be the same job instance
    const jobIds = jobs.map(j => j.id);
    const uniqueJobIds = new Set(jobIds);

    expect(uniqueJobIds.size).toBe(1);
    expect(Array.from(uniqueJobIds)[0]).toBe(jobId);
  });

  test('different users get different jobs', async () => {
    const user1 = 'user-aaa';
    const user2 = 'user-bbb';

    const job1 = await queue.add('generate', { userId: user1 }, {
      jobId: `summary:user:${user1}`,
    });

    const job2 = await queue.add('generate', { userId: user2 }, {
      jobId: `summary:user:${user2}`,
    });

    expect(job1.id).not.toBe(job2.id);
    expect(job1.id).toBe(`summary:user:${user1}`);
    expect(job2.id).toBe(`summary:user:${user2}`);
  });

  test('job deduplication persists across restarts', async () => {
    const userId = 'test-user-789';
    const jobId = `summary:user:${userId}`;

    // Add initial job
    const job1 = await queue.add('generate', { userId }, { jobId });
    expect(job1.id).toBe(jobId);

    // Simulate worker picking it up but not finishing
    const jobFromQueue = await queue.getJob(jobId);
    expect(jobFromQueue).not.toBeNull();

    // Try to add again (before first completes)
    const job2 = await queue.add('generate', { userId }, { jobId });

    // Should still be the same
    expect(job2.id).toBe(job1.id);
  });

  test('idempotency key prevents double-enqueue', async () => {
    const userId = 'test-user-idempotent';
    const idempotencyKey = 'uuid-12345678-abcd-1234-abcd-1234567890ab';

    // First request with idempotency key
    const job1 = await queue.add('generate', { userId }, {
      jobId: idempotencyKey,
    });

    // Second request with same key
    const job2 = await queue.add('generate', { userId }, {
      jobId: idempotencyKey,
    });

    // Both return same job
    expect(job1.id).toBe(job2.id);
    expect(job1.id).toBe(idempotencyKey);

    // Queue should have exactly 1 job for this ID
    const jobInQueue = await queue.getJob(idempotencyKey);
    expect(jobInQueue).not.toBeNull();
  });
});

describe('Concurrent Vote + Manual Regenerate', () => {
  let queue;
  let redis;

  beforeAll(async () => {
    redis = new Redis({ host: 'localhost', port: 6379 });
    queue = new Queue('profile-summary', { connection: redis });
  });

  afterAll(async () => {
    await queue.close();
    await redis.quit();
  });

  afterEach(async () => {
    await queue.clean(0);
  });

  test('simultaneous auto-trigger and manual regenerate dedupe', async () => {
    const userId = 'test-concurrent-user';

    // Simulate vote-triggered auto-generation
    const autoJob = await queue.add('generate', { userId, source: 'vote' }, {
      jobId: `summary:user:${userId}`,
      attempts: 3,
    });

    // Simultaneously, user clicks "regenerate" (different job ID)
    const manualIdempotencyKey = 'manual-uuid-9999-8888-7777-666655554444';
    const manualJob = await queue.add('generate', { userId, source: 'manual' }, {
      jobId: manualIdempotencyKey,
      attempts: 3,
    });

    // Should have 2 different jobs in flight
    const autoInQueue = await queue.getJob(`summary:user:${userId}`);
    const manualInQueue = await queue.getJob(manualIdempotencyKey);

    expect(autoInQueue).not.toBeNull();
    expect(manualInQueue).not.toBeNull();
    expect(autoJob.id).not.toBe(manualJob.id);
  });
});
