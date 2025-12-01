# OSRM Integration Guide

## What We're Using

**OSRM (Open Source Routing Machine)** for accurate walking route calculations.

### Current Setup: Public Demo Server
- **URL**: `https://router.project-osrm.org`
- **Cost**: Free
- **Rate Limit**: ~Unlimited for reasonable use
- **No API Key Required**: ✅

### Why OSRM?

**Before (Haversine Distance):**
- Straight-line "as the crow flies" distance
- Doesn't account for streets, buildings, parks
- Example: 1.2 km haversine might be 2.5 km actual walking

**After (OSRM Routing):**
- Uses real OpenStreetMap street network
- Follows actual walking paths
- Accounts for one-way streets, pedestrian paths, parks
- Example: Accurately calculates 2.5 km walking route

## How It Works

```typescript
// Old (haversine - inaccurate)
const distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
const durationMin = (distanceKm / 4.5) * 60; // Assumes 4.5 km/h

// New (OSRM - accurate)
const route = await getWalkingRoute(from, to);
// Returns actual walking distance and time from street network
```

## Fallback Strategy

```typescript
const route = await getWalkingRouteWithFallback(from, to);

// 1. Try OSRM first (accurate)
// 2. If OSRM fails → use haversine (fallback)
// 3. Always returns a result
```

## Changes Made

### 1. Created `osrmService.ts`
- `getWalkingRoute()` - Single point-to-point
- `getMultiPointRoute()` - Multi-waypoint routes
- `getWalkingRouteWithFallback()` - Auto-fallback to haversine

### 2. Updated `routeBuilderService.ts`
- Now uses OSRM for accurate route calculations
- Relaxed time buffers (50%-120% instead of 70%-85%)
- Logs OSRM vs haversine usage for monitoring

### 3. Benefits
- ✅ More accurate walk times
- ✅ Considers actual street network
- ✅ Better building selection (uses real walking routes)
- ✅ Free forever (open source)

## Testing

Test OSRM directly:

```bash
# Example: NYC to Empire State Building
curl "https://router.project-osrm.org/route/v1/foot/-73.9857,40.7484;-73.9875,40.7488?overview=false"
```

Response:
```json
{
  "code": "Ok",
  "routes": [{
    "distance": 245.7,  // meters
    "duration": 184.2   // seconds
  }]
}
```

## Self-Hosting (Future)

When you outgrow the public server:

### Option 1: Docker (Easiest)
```bash
docker run -t -i -p 5000:5000 \
  -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/new-york-latest.osrm
```

### Option 2: Cloud Hosting
- **DigitalOcean**: $12/month (2GB RAM minimum)
- **AWS EC2**: t3.small (~$15/month)
- **Fly.io**: Free tier with 256MB RAM (might work for NYC only)

### Data Requirements
- **NYC only**: ~500 MB
- **USA**: ~8 GB
- **World**: ~50 GB

## Rate Limits

**Public Demo Server:**
- No official limit
- Fair use policy (~100 requests/min is fine)
- Your current usage: ~10-20 requests per walk (very low)

**If you hit limits:**
- Self-host (unlimited)
- Use GraphHopper free tier (500 requests/day)
- Use Mapbox (100k requests/month free)

## Monitoring

Check logs for OSRM usage:
```
[routeBuilder] Route calculations {
  osrmUsed: 8,
  haversineUsed: 2,
  totalTime: '32.5'
}
```

- **osrmUsed > 0**: OSRM working ✅
- **haversineUsed only**: OSRM server down, using fallback ⚠️

## Alternative APIs (If Needed)

| Service | Free Tier | Rate Limit | Accuracy |
|---------|-----------|------------|----------|
| OSRM (demo) | ✅ Free | ~Unlimited | ⭐⭐⭐⭐⭐ |
| MapBox | ✅ Free | 100k/month | ⭐⭐⭐⭐⭐ |
| GraphHopper | ✅ Free | 500/day | ⭐⭐⭐⭐ |
| Google Maps | ❌ Paid | $5/1k requests | ⭐⭐⭐⭐⭐ |

**Recommendation**: Stick with OSRM demo for now, self-host if you scale.
