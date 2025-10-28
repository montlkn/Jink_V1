# Deployment Guide: AI Profile Summary Backend

Complete walkthrough for running the backend with Upstash Redis and Docker.

---

## Prerequisites

- ✅ Upstash Redis account (free tier works)
- ✅ Google Gemini API key
- ✅ Supabase project with migrations applied
- ✅ Docker & Docker Compose installed

---

## Step 1: Get Upstash Redis URL

1. Go to https://console.upstash.com/redis
2. Create a database (or use existing)
3. Copy the **`rediss://`** connection string (NOT the REST URL)
4. Should look like: `rediss://:password@hostname:port`

---

## Step 2: Create Backend Directory Structure

Since your app currently has server code mixed with mobile, create this structure:

```
/apps/server/                 (new)
  ├── src/
  │   ├── lib/queue.js       (move from src/)
  │   ├── middleware/        (move from src/)
  │   ├── workers/           (move from src/)
  │   ├── services/summary/  (move from src/)
  │   ├── api/routes/        (move from src/)
  │   ├── config/aiConfig.js (can share or duplicate)
  │   ├── utils/             (pure functions - can share or duplicate)
  │   └── index.js           (API entry point)
  ├── bin/
  │   ├── start-api.js       (new - start Express server)
  │   └── start-worker.js    (new - start BullMQ worker)
  ├── Dockerfile             (new - API container)
  ├── Dockerfile.worker      (new - Worker container)
  ├── package.json           (new - backend deps)
  └── .env.example           (new - config template)
```

---

## Step 3: Backend package.json

Create `/apps/server/package.json`:

```json
{
  "name": "@myorg/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node bin/start-api.js",
    "worker": "node bin/start-worker.js",
    "dev": "nodemon bin/start-api.js",
    "dev:worker": "nodemon bin/start-worker.js",
    "build": "echo 'No build needed for CommonJS'"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.52.1",
    "bullmq": "^5.61.0",
    "express": "^4.18.0",
    "ioredis": "^5.8.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## Step 4: Backend Environment Variables

Create `/apps/server/.env`:

```bash
# Redis (from Upstash)
REDIS_URL=rediss://:your_password@your_host:your_port

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
AI_PRIMARY_MODEL=gemini-2.0-flash-lite
AI_FALLBACK_MODEL=gemini-2.0-flash
AI_GENERATION_ENABLED=true

# Thresholds
DIVERGENCE_THRESHOLD_PCT=6
BREAKER_THRESHOLD_PCT=15
DAILY_CAP=5

# Server
PORT=8080
NODE_ENV=production
```

---

## Step 5: Express API Entry Point

Create `/apps/server/bin/start-api.js`:

```javascript
#!/usr/bin/env node

import express from 'express';
import { summaryQueue } from '../src/lib/queue.js';
import {
  handleGetSummary,
  handleRegenerateSummary,
  handleGetSummaryMeta,
} from '../src/api/routes/summaryRoutes.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Summary API
app.get('/v1/profile/summary', handleGetSummary);
app.post('/v1/profile/summary/regenerate', handleRegenerateSummary);
app.get('/v1/profile/summary/meta', handleGetSummaryMeta);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[api] Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[api] Server listening on port ${PORT}`);
});
```

Make it executable:

```bash
chmod +x /apps/server/bin/start-api.js
```

---

## Step 6: Worker Entry Point

Create `/apps/server/bin/start-worker.js`:

```javascript
#!/usr/bin/env node

import { startSummaryWorker } from '../src/workers/summaryWorker.js';
import { generateAndPersistSummary } from '../src/services/summary/generate.js';

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
```

Make it executable:

```bash
chmod +x /apps/server/bin/start-worker.js
```

---

## Step 7: Dockerfiles

Create `/apps/server/Dockerfile` (API):

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 8080

CMD ["node", "bin/start-api.js"]
```

Create `/apps/server/Dockerfile.worker` (Worker):

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production

CMD ["node", "bin/start-worker.js"]
```

Create `/apps/server/.dockerignore`:

```
node_modules
.git
dist
.env
.env.local
*.log
.DS_Store
```

---

## Step 8: Docker Compose

Create `/docker-compose.yml` in project root:

```yaml
version: "3.9"

services:
  api:
    build:
      context: ./apps/server
      dockerfile: Dockerfile
    container_name: architecture-app-api
    env_file:
      - ./apps/server/.env
    environment:
      NODE_ENV: production
    ports:
      - "8080:8080"
    restart: unless-stopped
    depends_on:
      - worker
    healthcheck:
      test: ["GET", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

  worker:
    build:
      context: ./apps/server
      dockerfile: Dockerfile.worker
    container_name: architecture-app-worker
    env_file:
      - ./apps/server/.env
    environment:
      NODE_ENV: production
    restart: unless-stopped
    # Optional: scale with `docker compose up -d --scale worker=3`
```

---

## Step 9: Deploy

### Local testing:

```bash
# Build and start services
docker compose up -d --build

# View logs
docker compose logs -f api
docker compose logs -f worker

# Test health endpoint
curl http://localhost:8080/healthz

# Test API (with valid token)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/v1/profile/summary?autogen=true"

# Stop
docker compose down
```

### Production deployment:

Modal is the canonical deployment target for the summary service. Follow `docs/MODAL_DEPLOYMENT.md` to:

1. Configure Modal secrets for Supabase, Redis, and Gemini.
2. Deploy `modal_app.py` via `modal deploy modal_app.py`.
3. Point the Expo client at the generated `https://<app>.modal.run` URL.

If you deploy to another platform (Render, Railway, etc.), reuse the Express entrypoint in `apps/server/bin/start-api.js` and mirror the same environment variables.

---

## Step 10: Monitor

### Check worker health:

```bash
docker compose exec worker node -e "
const redis = require('ioredis');
const r = new redis(process.env.REDIS_URL);
r.info('stats').then(info => console.log(info)).catch(e => console.error(e));
"
```

### View queue depth:

```javascript
// Quick check script
import { summaryQueue } from './src/lib/queue.js';

const count = await summaryQueue.getCount();
const failed = await summaryQueue.getFailedCount();
console.log(`Queue depth: ${count}, Failed: ${failed}`);
```

### Monitor logs:

```bash
# Follow logs in real-time
docker compose logs -f

# Specific service
docker compose logs -f worker
```

---

## Troubleshooting

### Worker won't connect to Redis

```
Error: getaddrinfo ENOTFOUND hostname
```

**Fix:**
- Verify `REDIS_URL` is the **`rediss://`** connection string (NOT REST URL)
- Check credentials and host are correct
- Verify Upstash network allows your IP

### API returns 503 (breaker open)

This is expected if Gemini API is down. API will return cached summaries with `needsUpdate: true`.

**Fix:**
- Check Gemini API status: https://status.anthropic.com
- Check logs for specific errors
- Breaker auto-recovers after cooldown

### Port 8080 already in use

```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>

# Or use different port
PORT=8081 docker compose up -d
```

### Docker build fails

```bash
# Clean up
docker compose down
docker system prune -a

# Rebuild
docker compose up -d --build
```

---

## Next Steps

- [ ] Create `.env` file with actual credentials
- [ ] Run `docker compose up -d --build`
- [ ] Test with curl
- [ ] Deploy to production platform
- [ ] Configure DNS / domain
- [ ] Set up monitoring / alerting
- [ ] Update mobile app API base URL

---

## Reference

- [BullMQ Docs](https://docs.bullmq.io/)
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Docker Compose](https://docs.docker.com/compose/)
