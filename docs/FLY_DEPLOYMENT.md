# Fly.io Deployment Guide

Complete walkthrough for deploying the AI Profile Summary backend to Fly.io.

---

## Prerequisites

1. ✅ Fly.io account (you just created this)
2. ✅ Fly CLI installed and authenticated (`flyctl auth login`)
3. ✅ GitHub repository (code pushed)
4. ✅ Credentials ready:
   - Upstash Redis URL (rediss://...)
   - Supabase URL & Service Key
   - Gemini API Key

---

## Step 1: Authenticate Fly CLI

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"
flyctl auth login
```

This opens a browser. Follow the prompts to log in. Once done, verify:

```bash
flyctl auth whoami
```

---

## Step 2: Push Code to GitHub

Fly.io deploys from GitHub. Push your code:

```bash
cd /Users/lucienmount/Arch_App_V2/architecture-app
git add .
git commit -m "Deploy: Fly.io backend configuration"
git push origin main
```

---

## Step 3: Create API App on Fly.io

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

cd /Users/lucienmount/Arch_App_V2/architecture-app

# Launch the API app
flyctl launch --config fly.toml --no-deploy
```

When prompted:
- **App name**: `architecture-app-api` (or your choice)
- **Region**: `ord` (Chicago - same region as Upstash for latency)
- **Postgres?**: No
- **Redis?**: No (using Upstash)

---

## Step 4: Set Secrets for API

Set environment variables (credentials are encrypted):

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

flyctl secrets set \
  --app architecture-app-api \
  REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT" \
  SUPABASE_URL="https://gzzvhmmywaaxljpmoacm.supabase.co" \
  SUPABASE_SERVICE_KEY="your_service_key_here" \
  GEMINI_API_KEY="your_gemini_key_here"
```

Verify secrets are set:

```bash
flyctl secrets list --app architecture-app-api
```

---

## Step 5: Deploy API

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

flyctl deploy --config fly.toml --app architecture-app-api
```

Monitor the deployment:

```bash
flyctl logs --app architecture-app-api
```

Once deployed, test:

```bash
curl https://architecture-app-api.fly.dev/healthz
```

Should return:
```json
{"status":"ok","timestamp":"2025-10-17T...Z"}
```

---

## Step 6: Create Worker App on Fly.io

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

# Launch the Worker app
flyctl launch --config fly.worker.toml --no-deploy
```

When prompted:
- **App name**: `architecture-app-worker` (or your choice)
- **Region**: `ord` (same as API)
- **Postgres?**: No
- **Redis?**: No

---

## Step 7: Set Secrets for Worker

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

flyctl secrets set \
  --app architecture-app-worker \
  REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT" \
  SUPABASE_URL="https://gzzvhmmywaaxljpmoacm.supabase.co" \
  SUPABASE_SERVICE_KEY="your_service_key_here" \
  GEMINI_API_KEY="your_gemini_key_here"
```

---

## Step 8: Deploy Worker

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

flyctl deploy --config fly.worker.toml --app architecture-app-worker
```

Check logs:

```bash
flyctl logs --app architecture-app-worker
```

Worker should start and say: `[worker] Worker started successfully`

---

## Step 9: Update Mobile App API URL

In your mobile app `.env`:

```bash
# Comment out localhost
# EXPO_PUBLIC_API_URL="http://localhost:8080"

# Use Fly.io URL
EXPO_PUBLIC_API_URL="https://architecture-app-api.fly.dev"
```

Then rebuild your React Native app.

---

## Step 10: Set Up Cost Alerts & Monitoring

### A. Budget Alert (Fly.io Dashboard)

1. Go to https://fly.io/dashboard
2. Click your organization
3. **Settings** → **Billing** → **Billing Email**
4. Set spending limit (e.g., $100/month)
5. Enable alerts at 50%, 75%, 90%

### B. Token Cost Tracking

The API logs token usage:
```
[summary-gen] Success {
  model: 'gemini-2.0-flash-lite',
  tokensIn: 245,
  tokensOut: 89,
  totalTokens: 334,
  result: 'success'
}
```

Calculate cost:
- Gemini Flash-lite: $0.075/million input, $0.30/million output
- Cost per generation: `(tokensIn * 0.075 + tokensOut * 0.30) / 1_000_000`

### C. Monitor Logs

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

# Real-time logs
flyctl logs --app architecture-app-api

# Search for costs
flyctl logs --app architecture-app-api | grep "tokensOut"
```

### D. Scaling

If you need more capacity, scale workers:

```bash
flyctl scale count --app architecture-app-worker 2
```

---

## Common Issues

### Issue: "ECONNREFUSED - Redis connection failed"

**Fix**: Verify Redis URL is correct and Upstash firewall allows Fly.io region.

```bash
flyctl secrets list --app architecture-app-api
```

### Issue: "Invalid token" errors

**Fix**: Check Supabase Service Key is copied correctly (no extra characters).

```bash
flyctl secrets set --app architecture-app-api SUPABASE_SERVICE_KEY="your_key_here"
```

### Issue: Worker not processing jobs

**Fix**: Check worker logs:

```bash
flyctl logs --app architecture-app-worker | grep error
```

### Issue: High costs unexpectedly

**Fix**: Check Gemini API token usage:

```bash
flyctl logs --app architecture-app-api | grep "summary-gen"
```

If counts are high, check:
- Rate limits are working
- Circuit breaker is engaged
- No infinite retry loops

---

## Production Checklist

- [ ] API app deployed and `/healthz` returns 200
- [ ] Worker app deployed and logs show "Worker started successfully"
- [ ] Secrets are set for both apps
- [ ] Redis connection working (check logs)
- [ ] Supabase auth working (test endpoints)
- [ ] Gemini API initialized
- [ ] Mobile app updated with Fly.io URL
- [ ] Cost alerts configured in Billing
- [ ] Monitoring setup for token usage
- [ ] Team invited to Fly.io organization

---

## Useful Commands

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

# View app status
flyctl status --app architecture-app-api

# SSH into an instance (for debugging)
flyctl ssh console --app architecture-app-api

# View real-time metrics
flyctl monitor --app architecture-app-api

# Scale machines
flyctl scale count --app architecture-app-api 2

# Restart app
flyctl restart --app architecture-app-api

# View current secrets
flyctl secrets list --app architecture-app-api
```

---

## Next Steps

1. ✅ Log in to Fly.io (`flyctl auth login`)
2. ✅ Create and deploy API
3. ✅ Create and deploy Worker
4. ✅ Update mobile app URL
5. ✅ Test end-to-end
6. ✅ Set up monitoring & alerts
7. ✅ Celebrate! 🚀
