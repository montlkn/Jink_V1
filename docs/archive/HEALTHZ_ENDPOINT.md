# Health Check Endpoint

Add this to your backend to monitor queue and worker health.

## Endpoint: GET /healthz

Returns 200 if healthy, 503 if degraded.

### Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T15:30:00Z",
  "checks": {
    "redis": {
      "status": "ok",
      "latency_ms": 2
    },
    "queue": {
      "status": "ok",
      "queue_depth": 15,
      "failed_count": 0,
      "worker_count": 3
    },
    "gemini_api": {
      "status": "ok",
      "last_check": "2025-10-17T15:29:50Z"
    }
  }
}
```

### Response (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-17T15:30:00Z",
  "checks": {
    "redis": {
      "status": "down",
      "error": "Connection refused"
    },
    "queue": {
      "status": "degraded",
      "queue_depth": 250,
      "failed_count": 42
    },
    "gemini_api": {
      "status": "down",
      "error": "API rate limit exceeded"
    }
  }
}
```

## Implementation (Node.js/Express example)

```typescript
// backend/src/routes/health.ts

import { Router } from 'express';
import { summaryQueue } from '../lib/queue';
import { redis } from '../lib/redis';
import { checkGeminiHealth } from '../services/ai/client';

const router = Router();

router.get('/healthz', async (req, res) => {
  try {
    const checks = {
      redis: await checkRedis(),
      queue: await checkQueue(),
      gemini_api: await checkGeminiHealth(),
    };

    const healthy = Object.values(checks).every(c => c.status !== 'down');

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

async function checkRedis() {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: 'ok',
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

async function checkQueue() {
  try {
    const queue_depth = await summaryQueue.getCount();
    const failed_count = await summaryQueue.getFailedCount();
    const workers = await summaryQueue.getWorkers();

    return {
      status: 'ok',
      queue_depth,
      failed_count,
      worker_count: workers.length,
    };
  } catch (error) {
    return {
      status: 'degraded',
      error: error.message,
    };
  }
}

export default router;
```

## Monitoring Integration

### Kubernetes probe:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### On-call dashboard query:

```
Alert if:
  - /healthz returns 503
  - queue_depth > 1000
  - failed_count > 50
  - worker_count == 0
```

This endpoint will save debugging time at 2 AM when things go sideways.
