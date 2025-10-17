# Fly.io Billing & Cost Alerts Setup

Complete guide for setting up cost monitoring and alerts on Fly.io.

---

## Step 1: Set Spending Limit

1. Go to https://fly.io/dashboard
2. Click your organization name (top right)
3. Click **Settings**
4. Click **Billing**
5. In "Spending Limit" section:
   - Enable the toggle
   - Set limit to `$100` (or your budget)
   - This stops new deployments if limit is exceeded

---

## Step 2: Enable Billing Alerts

1. Still in **Settings** → **Billing**
2. Scroll to "Email Notifications"
3. Check these boxes:
   - ☑ Account limit approaching (50%)
   - ☑ Account limit warning (75%)
   - ☑ Account limit exceeded (90%)
4. Verify your email is correct
5. Click **Save**

---

## Step 3: Cost Breakdown

Your costs come from:

### Compute (Machines)
- **API**: 1 shared-cpu-1x (1GB RAM) = ~$1.94/month
- **Worker**: 1 shared-cpu-1x (512MB RAM) = ~$0.97/month
- **Total Compute**: ~$2.91/month

### Data Transfer
- First 100 GB/month free
- Outbound after 100GB: $0.02/GB

### Gemini API (Separate bill, not Fly.io)
- **Primary (Flash-lite)**: $0.075/million input tokens, $0.30/million output
- **Fallback (Flash)**: $0.15/million input tokens, $0.60/million output
- Cost per generation: ~$0.0001 (varies with token count)
- Estimated for 5 users/day: ~$1.50/month

### Upstash Redis (Separate bill, not Fly.io)
- Free tier: Up to 10,000 commands/day
- Paid: $0.20 per 100,000 commands
- Estimated: ~$2/month (with rate limiting)

### **Total Monthly Estimate: ~$7-10/month**

---

## Step 4: Monitor Token Usage

The API logs every generation with token counts. Example log:

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
```
Cost = (tokensIn * 0.075 + tokensOut * 0.30) / 1,000,000
     = (245 * 0.075 + 89 * 0.30) / 1,000,000
     = (18.375 + 26.7) / 1,000,000
     = 0.0000450 (about $0.0000450 per generation)
```

### View Logs

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

# Real-time logs
flyctl logs --app architecture-app-api

# Filter for token counts
flyctl logs --app architecture-app-api --no-tail | grep "tokensOut"

# Export logs for analysis
flyctl logs --app architecture-app-api --no-tail > logs.txt
```

---

## Step 5: Cost Control Best Practices

### Rate Limiting (Built-in)
✅ Per-user burst: 1
✅ Per-user sustained: 1 per 10 minutes
✅ Per-user daily: 5 max generations

This prevents runaway costs from user activity.

### Circuit Breaker (Built-in)
✅ Opens at 15% failure rate
✅ Returns cached data instead of errors
✅ Auto-recovers after cooldown

This prevents cascading failures from burning through API quota.

### Manual Safeguards
- Monitor token logs weekly
- Check Fly.io dashboard for compute costs
- Set budget alerts at 50%, 75%, 90%
- Review Upstash Redis usage monthly

---

## Step 6: Alert Triggers & Actions

| Alert | What It Means | Action |
|-------|---------------|--------|
| 50% of budget | Running at half speed | Check logs for token usage spike |
| 75% of budget | Getting close | Review active users, consider scaling back |
| 90% of budget | Almost out of money | STOP deployments, investigate costs |
| Spending limit exceeded | Hard stop | Increase limit or disable services |

---

## Step 7: Example Monthly Bill Breakdown

**Scenario: 10 active users, 1-2 generations/day each**

| Service | Usage | Cost |
|---------|-------|------|
| Fly.io Compute | API + Worker | $2.91 |
| Fly.io Egress | ~50GB/month | $0 (free tier) |
| Gemini API | ~250 generations | $2.50 |
| Upstash Redis | ~500k commands | $1.00 |
| **TOTAL** | | **~$6.41** |

---

## Step 8: Optimization Tips

### Reduce Token Count
- Shorter prompts = fewer tokens
- Cache summaries (don't regenerate unnecessarily)
- Use Primary model (Flash-lite) more than Fallback

### Reduce API Calls
- Increase rate limits threshold (6% → 10%)
- Increase daily cap (5 → 10)
- Batch operations if possible

### Reduce Data Transfer
- Use compression headers
- Most of your data is internal (API ↔ Redis ↔ Supabase)
- External transfer is minimal

---

## Emergency Cost Cutoff

If costs spike unexpectedly:

```bash
export PATH="/Users/lucienmount/.fly/bin:$PATH"

# Pause API machine
flyctl machines stop d896d3a604ed08 --app architecture-app-api

# Pause Worker machine
flyctl machines stop <worker-id> --app architecture-app-worker

# Get current spending
flyctl status --app architecture-app-api
```

---

## Links

- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Upstash Redis Pricing](https://upstash.com/pricing/redis)
- [Google Gemini Pricing](https://ai.google.dev/pricing)
- [Fly.io Dashboard](https://fly.io/dashboard)
