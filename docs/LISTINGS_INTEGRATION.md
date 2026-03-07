# Real Estate Listings Integration Guide

## Overview

The listings feature supports both **premium agent-placed listings** and **free public listings** from Zillow and StreetEasy.

## Database Structure

### Main Supabase (User Data)
All listings tables go in your **main Supabase** (the one with `EXPO_PUBLIC_SUPABASE_URL`):

1. `listing_agents` - Agent profiles and subscriptions
2. `property_listings` - All listings (premium + free)
3. `listing_photos` - Listing images
4. `listing_analytics` - Impression/click tracking
5. `listing_applications` - Tour requests from users

**Why main Supabase?**
- Listings are **user-facing features** that require authentication
- Need RLS policies for agents to manage their listings
- Analytics and applications tied to user accounts

### Buildings Supabase
The buildings database (`EXPO_PUBLIC_BUILDINGS_SUPABASE_URL`) contains:
- Building architecture data (architect, style, year, etc.)
- Read-only reference data

## Zillow & StreetEasy Integration

### Current State: Manual Import
The original plan mentioned Zillow/StreetEasy, but currently listings are **manually added** to the database. Free listings have:
- `source: 'zillow'` or `source: 'streeteasy'`
- `source_url`: Link to original listing
- `is_premium: false`

### Option 1: API Integration (Recommended)

**Zillow Bridge API** (Unofficial)
```typescript
// Example service to fetch Zillow listings
import axios from 'axios';

async function fetchZillowListings(address: string) {
  // Use Zillow's unofficial API or third-party services like:
  // - RapidAPI Zillow scrapers
  // - ScraperAPI
  // - Bright Data

  const response = await axios.get('https://api.example.com/zillow', {
    params: { address },
  });

  return response.data.listings.map(listing => ({
    bin: building.bin,
    listing_type: listing.homeType === 'FOR_RENT' ? 'rent' : 'sale',
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    square_feet: listing.livingArea,
    price_display: listing.price,
    source: 'zillow',
    source_url: listing.detailUrl,
    is_premium: false,
  }));
}
```

**StreetEasy API**
StreetEasy doesn't have a public API. Options:
1. Partner directly (requires business relationship)
2. Use web scraping (against ToS, not recommended)
3. Manual curation for high-value buildings

### Option 2: Automated Scraping (Use with Caution)

⚠️ **Legal Warning**: Check Terms of Service before scraping.

Example scraper setup:
```typescript
// supabase/functions/sync-listings/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as cheerio from 'cheerio';

serve(async (req) => {
  // Triggered by cron job or manual invoke
  const buildings = await getPopularBuildings();

  for (const building of buildings) {
    const address = building.address;

    // Scrape Zillow
    const zillowListings = await scrapeZillow(address);

    // Insert/update in database
    await upsertListings(building.bin, zillowListings);
  }

  return new Response('Sync complete', { status: 200 });
});
```

Schedule with cron:
```bash
# Run daily at 3am
0 3 * * * curl -X POST https://your-project.supabase.co/functions/v1/sync-listings
```

### Option 3: Hybrid Approach (Best for MVP)

1. **Premium listings**: Agent-submitted, always up-to-date
2. **Free listings**: Manually curated for landmark buildings
   - Focus on top 50-100 buildings
   - Update monthly via admin panel
   - Use public data sources (Zillow, StreetEasy URLs)

## Setup Instructions

### 1. Apply Database Migrations

```bash
# Navigate to project root
cd /path/to/architecture-app

# Apply listings schema to MAIN Supabase
supabase db push

# This applies all migrations including:
# - listings_schema.sql
# - 20260216_add_missing_event_types.sql (for aesthetic events)
```

### 2. Add Sample Data (for Testing)

Run the `create_sample_listings.sql` file:

```bash
# Option A: Via Supabase dashboard
# 1. Open SQL Editor
# 2. Paste contents of create_sample_listings.sql
# 3. Run query

# Option B: Via psql
psql $EXPO_PUBLIC_SUPABASE_URL -f create_sample_listings.sql
```

### 3. Enable Feature Flags

Already done! In `src/config/featureFlags.ts`:
```typescript
listings: {
  enabled: true,
  showOnBuildingInfo: true,
  premiumEnabled: false, // Enable when agents start paying
}
```

## Adding Listings Manually

### For Testing
```sql
-- 1. Create agent
INSERT INTO listing_agents (agent_name, email, subscription_status)
VALUES ('Test Agent', 'test@example.com', 'active');

-- 2. Add listing (get building BIN from BuildingInfoScreen)
INSERT INTO property_listings (
  bin, listing_type, bedrooms, bathrooms,
  price_display, source, is_premium
) VALUES (
  '1004110', -- Chrysler Building BIN
  'sale',
  2,
  2.0,
  '$3,500,000',
  'agent',
  false
);
```

### For Production: Admin Panel
Create an admin interface at `/admin/listings` to:
1. Search buildings by name/address
2. Add listing details
3. Upload photos
4. Set pricing/availability

## Zillow/StreetEasy Data Mapping

| Zillow Field | Our Field | Notes |
|-------------|-----------|-------|
| `zpid` | `source_listing_id` | Zillow Property ID |
| `address` | Matched to `bin` | Via NYC geocoding |
| `price` | `price_display` | e.g., "$1,200,000" |
| `bedrooms` | `bedrooms` | Integer |
| `bathrooms` | `bathrooms` | Decimal (1.5, 2.0) |
| `livingArea` | `square_feet` | Integer |
| `detailUrl` | `source_url` | Link to Zillow |
| `imgSrc` | `listing_photos.photo_url` | Primary image |

## Agent Onboarding Flow

When `premiumEnabled: true`:

1. Agent signs up → Creates account
2. Selects subscription tier (Basic/Pro/Premium)
3. Adds payment method (Stripe integration)
4. Can create premium listings:
   - Featured placement
   - Multiple photos
   - Contact buttons
   - Analytics dashboard

## Analytics Queries

```sql
-- Top performing listings (most impressions)
SELECT
  pl.title,
  COUNT(CASE WHEN la.event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN la.event_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN la.event_type = 'contact' THEN 1 END) as contacts
FROM property_listings pl
LEFT JOIN listing_analytics la ON pl.id = la.listing_id
WHERE pl.agent_id = 'YOUR_AGENT_ID'
GROUP BY pl.id, pl.title
ORDER BY impressions DESC;
```

## Next Steps

1. ✅ Database schema applied
2. ✅ UI components built
3. ⬜ Add sample data for testing
4. ⬜ Test full flow: view → detail → request tour
5. ⬜ Decide on Zillow/StreetEasy strategy
6. ⬜ Build admin panel for manual listing management
7. ⬜ Set up agent onboarding (if going premium route)

## Questions?

- **Which buildings should have listings?** Focus on residential buildings, not just landmarks
- **Pricing model?** Monthly subscription ($99-$499) or per-listing ($29-$99)
- **Geographic scope?** Start with Manhattan landmarks, expand to all NYC boroughs
